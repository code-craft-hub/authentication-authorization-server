import { JobRecommendationRepository } from "../repositories/job-recommendation.repository";
import {
  JobRecommendationRequest,
  ScoredJobPost,
  SearchMetadata,
} from "../../../types";
import { CacheService } from "../../../shared/services/cache.service";
import { PersonalizationService } from "./personalization.service";

/**
 * Service layer for job recommendations
 * Orchestrates business logic, caching, and personalization
 * 
 * @class JobRecommendationService
 */
export class JobRecommendationService {
  private cacheService: CacheService;
  private personalizationService: PersonalizationService;

  constructor(
    private repository: JobRecommendationRepository,
    cacheService?: CacheService
  ) {
    this.cacheService = cacheService || new CacheService();
    this.personalizationService = new PersonalizationService(repository);
  }

  /**
   * Generate personalized job recommendations with caching
   * Excludes already viewed jobs and applies user preferences
   */
  async generateRecommendations(
    request: JobRecommendationRequest
  ): Promise<{
    recommendations: ScoredJobPost[];
    metadata: SearchMetadata;
    newJobsCount: number;
  }> {
    const startTime = Date.now();
    const {
      jobTitle,
      skills,
      userId,
      sessionId,
      filters,
      excludeViewed = true,
      page = 1,
      pageSize = 20,
    } = request;

    // Validate inputs
    this.validateRequest(request);

    // Generate cache key
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first (only for non-personalized or anonymous requests)
    let cacheHit = false;
    if (!userId || !excludeViewed) {
      const cached = await this.cacheService.get<ScoredJobPost[]>(cacheKey);
      if (cached) {
        cacheHit = true;
        const paginatedResults = this.paginateResults(cached, page, pageSize);
        
        return {
          recommendations: paginatedResults,
          metadata: this.buildMetadata(
            request,
            cached.length,
            Date.now() - startTime,
            true,
            false
          ),
          newJobsCount: cached.length,
        };
      }
    }

    // Apply user profile filters if available
    let enhancedFilters = filters;
    let personalizationApplied = false;
    
    if (userId) {
      const userProfile = await this.repository.getUserProfile(userId);
      if (userProfile) {
        enhancedFilters = this.mergeFiltersWithProfile(filters, userProfile);
        personalizationApplied = true;
      }
    }

    // Fetch jobs from repository
    const fetchLimit = Math.max(100, pageSize * 5); // Fetch more for better filtering
    const rawJobs = await this.repository.findRelevantJobs(
      jobTitle,
      skills,
      userId,
      enhancedFilters,
      excludeViewed,
      fetchLimit
    );

    // Get user interaction data if authenticated
    let interactionMap = new Map();
    if (userId && rawJobs.length > 0) {
      const jobIds = rawJobs.map((j: any) => j.id);
      interactionMap = await this.repository.getUserJobInteractions(userId, jobIds);
    }

    // Enrich and score jobs
    let scoredJobs = rawJobs.map((job: any) =>
      this.enrichJobWithMatchDetails(job, jobTitle, skills, interactionMap)
    );

    // Apply personalization boost if user is authenticated
    if (userId) {
      scoredJobs = await this.personalizationService.applyPersonalizationBoost(
        scoredJobs,
        userId
      );
      personalizationApplied = true;
    }

    // Apply quality filters
    scoredJobs = this.applyQualityFilters(scoredJobs);

    // Sort by final score
    scoredJobs.sort((a, b) => b.relevance_score - a.relevance_score);

    // Cache results (only for non-personalized requests)
    if (!userId || !excludeViewed) {
      await this.cacheService.set(cacheKey, scoredJobs, 300); // 5 min TTL
    }

    // Get count of new jobs for user
    let newJobsCount = scoredJobs.length;
    if (userId) {
      try {
        newJobsCount = await this.repository.getNewJobsCount(
          jobTitle,
          skills,
          userId,
          enhancedFilters
        );
      } catch (error) {
        console.error("Failed to get new jobs count:", error);
      }
    }

    // Save search query for analytics
    if (sessionId) {
      await this.repository.saveSearchQuery(
        userId,
        sessionId,
        jobTitle,
        skills,
        enhancedFilters,
        scoredJobs.length,
        Math.min(scoredJobs.length, pageSize)
      ).catch(err => console.error("Failed to save search query:", err));
    }

    // Paginate results
    const paginatedResults = this.paginateResults(scoredJobs, page, pageSize);

    return {
      recommendations: paginatedResults,
      metadata: this.buildMetadata(
        request,
        scoredJobs.length,
        Date.now() - startTime,
        cacheHit,
        personalizationApplied
      ),
      newJobsCount,
    };
  }

  /**
   * Track user interaction with a job
   */
  async trackJobInteraction(
    userId: string,
    jobId: string,
    interactionType: string,
    sessionId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.repository.trackInteraction(
      userId,
      jobId,
      interactionType,
      sessionId,
      metadata
    );

    // Invalidate relevant caches on important interactions
    if (["saved", "dismissed", "clicked_apply"].includes(interactionType)) {
      await this.cacheService.invalidatePattern(`user:${userId}:*`);
    }
  }

  /**
   * Update user profile from search patterns
   */
  async updateUserProfile(
    userId: string,
    jobTitle: string,
    skills: string[]
  ): Promise<void> {
    const existingProfile = await this.repository.getUserProfile(userId);

    // Merge with existing data
    const updatedSkills = existingProfile?.skills || [];
    skills.forEach((skill) => {
      if (!updatedSkills.includes(skill)) {
        updatedSkills.push(skill);
      }
    });

    await this.repository.upsertUserProfile({
      userId,
      desiredJobTitle: jobTitle,
      skills: updatedSkills.slice(0, 50), // Keep top 50 skills
    });
  }

  /**
   * Validate recommendation request
   */
  private validateRequest(request: JobRecommendationRequest): void {
    const { jobTitle, skills } = request;

    if (!jobTitle || jobTitle.trim().length === 0) {
      throw new Error("Job title is required");
    }

    if (!skills || skills.length === 0) {
      throw new Error("At least one skill is required");
    }

    if (skills.length > 50) {
      throw new Error("Maximum 50 skills allowed");
    }

    // Validate skill format
    skills.forEach((skill) => {
      if (typeof skill !== "string" || skill.trim().length === 0) {
        throw new Error("All skills must be non-empty strings");
      }
    });
  }

  /**
   * Enrich job with match details and interaction status
   */
  private enrichJobWithMatchDetails(
    job: any,
    userJobTitle: string,
    userSkills: string[],
    interactionMap: Map<string, any>
  ): ScoredJobPost {
    const matchReasons: string[] = [];
    const descriptionLower = (job.description_text || "").toLowerCase();
    const titleLower = (job.title || "").toLowerCase();

    // Analyze title match
    const titleSimilarity = job.title_similarity || 0;
    if (titleSimilarity > 0.5) {
      matchReasons.push("Strong title match");
    } else if (titleSimilarity > 0.3) {
      matchReasons.push("Similar job title");
    }

    // Analyze skill matches
    const matchedSkills: string[] = [];
    userSkills.forEach((skill) => {
      const skillLower = skill.toLowerCase();
      if (
        descriptionLower.includes(skillLower) ||
        titleLower.includes(skillLower)
      ) {
        matchedSkills.push(skill);
      }
    });

    const skillMatchCount = matchedSkills.length;
    if (skillMatchCount >= 3) {
      matchReasons.push(`${skillMatchCount} of your skills match`);
    } else if (skillMatchCount === 2) {
      matchReasons.push(`2 skills match: ${matchedSkills.join(", ")}`);
    } else if (skillMatchCount === 1) {
      matchReasons.push(`Matches skill: ${matchedSkills[0]}`);
    }

    // Check seniority level
    const seniorityKeywords = this.extractSeniorityLevel(userJobTitle.toLowerCase());
    if (seniorityKeywords && titleLower.includes(seniorityKeywords)) {
      matchReasons.push("Matching seniority level");
    }

    // Recency
    const daysOld = Math.floor(
      (Date.now() - new Date(job.posted_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysOld <= 7) {
      matchReasons.push("Recently posted");
    }

    // Get interaction status
    const interaction = interactionMap.get(job.id);

    return {
      id: job.id,
      title: job.title,
      company_name: job.company_name,
      company_logo: job.company_logo,
      location: job.location,
      salary_info: job.salary_info,
      posted_at: job.posted_at,
      description_text: job.description_text,
      description_html: job.description_html,
      apply_url: job.apply_url,
      job_function: job.job_function,
      employment_type: job.employment_type,
      expire_at: job.expire_at,
      link: job.link,
      source: job.source,
      relevance_score: Math.round(job.relevance_score * 100) / 100,
      match_reasons: matchReasons.length > 0 ? matchReasons : ["General match"],
      skill_match_count: skillMatchCount,
      title_similarity: titleSimilarity,
      is_viewed: interaction?.isViewed || false,
      is_saved: interaction?.isSaved || false,
      interaction_count: interaction?.count || 0,
      personalization_boost: 0, // Will be set by personalization service
    };
  }

  /**
   * Extract seniority level from job title
   */
  private extractSeniorityLevel(title: string): string | null {
    const seniorityLevels = [
      "intern",
      "junior",
      "mid-level",
      "senior",
      "lead",
      "principal",
      "staff",
      "architect",
      "director",
      "vp",
      "chief",
    ];

    for (const level of seniorityLevels) {
      if (title.includes(level)) {
        return level;
      }
    }
    return null;
  }

  /**
   * Apply quality filters for diversity and relevance
   */
  private applyQualityFilters(jobs: ScoredJobPost[]): ScoredJobPost[] {
    // Remove duplicates by company-title combination
    const seen = new Set<string>();
    const uniqueJobs: ScoredJobPost[] = [];

    for (const job of jobs) {
      const key = `${job.company_name}-${job.title}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueJobs.push(job);
      }
    }

    // Filter by minimum relevance threshold
    const filtered = uniqueJobs.filter((job) => job.relevance_score >= 5);

    // Ensure company diversity (max 3 jobs per company in top results)
    return this.ensureCompanyDiversity(filtered, 3);
  }

  /**
   * Ensure company diversity in results
   */
  private ensureCompanyDiversity(
    jobs: ScoredJobPost[],
    maxPerCompany: number
  ): ScoredJobPost[] {
    const companyCount = new Map<string, number>();
    const result: ScoredJobPost[] = [];

    for (const job of jobs) {
      const company = job.company_name?.toLowerCase() || "unknown";
      const count = companyCount.get(company) || 0;

      if (count < maxPerCompany) {
        result.push(job);
        companyCount.set(company, count + 1);
      }
    }

    return result;
  }

  /**
   * Merge user profile filters with request filters
   */
  private mergeFiltersWithProfile(
    requestFilters: any,
    userProfile: any
  ): any {
    return {
      ...requestFilters,
      locations: requestFilters?.locations || userProfile.preferredLocations,
      employmentTypes:
        requestFilters?.employmentTypes || userProfile.preferredEmploymentTypes,
      excludeCompanies: [
        ...(requestFilters?.excludeCompanies || []),
        ...(userProfile.excludedCompanies || []),
      ],
    };
  }

  /**
   * Paginate results
   */
  private paginateResults(
    jobs: ScoredJobPost[],
    page: number,
    pageSize: number
  ): ScoredJobPost[] {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return jobs.slice(startIndex, endIndex);
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: JobRecommendationRequest): string {
    const { jobTitle, skills, filters, userId, excludeViewed } = request;
    const keyParts = [
      userId ? `user:${userId}` : "anon",
      `title:${jobTitle.toLowerCase()}`,
      `skills:${skills.sort().join(",")}`,
      filters ? `filters:${JSON.stringify(filters)}` : "",
      excludeViewed ? "exclude-viewed" : "",
    ];
    return keyParts.filter(Boolean).join(":");
  }

  /**
   * Build search metadata
   */
  private buildMetadata(
    request: JobRecommendationRequest,
    totalCount: number,
    executionTime: number,
    cacheHit: boolean,
    personalizationApplied: boolean
  ): SearchMetadata {
    return {
      user_job_title: request.jobTitle,
      user_skills: request.skills,
      algorithm_version: "3.0",
      filters_applied: request.filters,
      execution_time_ms: executionTime,
      cache_hit: cacheHit,
      personalization_factors: personalizationApplied
        ? ["user_profile", "interaction_history", "engagement_patterns"]
        : undefined,
    };
  }
}