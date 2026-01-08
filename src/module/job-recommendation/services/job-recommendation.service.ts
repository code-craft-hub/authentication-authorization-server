import { JobRecommendationRepository } from "../repositories/job-recommendation.repository";
import { JobRecommendationRequest, ScoredJobPost } from "../../../types";

export class JobRecommendationService {
  constructor(private repository: JobRecommendationRepository) {}

  /**
   * Generate personalized job recommendations
   */
  async generateRecommendations(
    request: JobRecommendationRequest
  ): Promise<ScoredJobPost[]> {
    const { jobTitle, skills } = request;

    // Validate inputs
    if (!jobTitle || jobTitle.trim().length === 0) {
      throw new Error("Job title is required");
    }

    if (!skills || skills.length === 0) {
      throw new Error("At least one skill is required");
    }

    // Fetch relevant jobs from database
    const rawJobs = await this.repository.findRelevantJobs(
      jobTitle,
      skills,
      100 // Fetch more than needed for post-processing
    );

    // Extract rows from query result
    // @ts-ignore
    const jobs = rawJobs.rows || rawJobs;

    // Post-process and enrich results
    const scoredJobs = jobs.map((job: any) =>
      this.enrichJobWithMatchDetails(job, jobTitle, skills)
    );

    // Apply diversity and quality filters
    const filteredJobs = this.applyQualityFilters(scoredJobs);

    // Sort by final score and return top 20
    return filteredJobs
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 20);
  }

  /**
   * Enrich job with match details and reasons
   */
  private enrichJobWithMatchDetails(
    job: any,
    userJobTitle: string,
    userSkills: string[]
  ): ScoredJobPost {
    const matchReasons: string[] = [];
    const descriptionLower = (job.description_text || "").toLowerCase();
    const titleLower = (job.title || "").toLowerCase();
    const userTitleLower = userJobTitle.toLowerCase();

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

    // Check for seniority level match
    const seniorityKeywords = this.extractSeniorityLevel(userTitleLower);
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

    // Ensure minimum relevance threshold
    return uniqueJobs.filter((job) => job.relevance_score >= 5);
  }
}
