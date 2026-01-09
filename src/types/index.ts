/**
 * Core domain types for job recommendation system
 */

export interface JobRecommendationRequest {
  jobTitle: string;
  skills: string[];
  userId?: string;
  sessionId?: string;
  filters?: RecommendationFilters;
  excludeViewed?: boolean; // NEW: Exclude already viewed jobs
  page?: number; // NEW: Pagination support
  pageSize?: number;
}

export interface RecommendationFilters {
  locations?: string[];
  employmentTypes?: string[];
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: string;
  remoteOnly?: boolean;
  postedWithinDays?: number;
  excludeCompanies?: string[];
}

export interface ScoredJobPost {
  id: string;
  title: string;
  company_name: string;
  company_logo?: string;
  location?: string;
  salary_info?: any;
  posted_at?: string;
  description_text?: string;
  description_html?: string;
  apply_url?: string;
  job_function?: string;
  employment_type?: string;
  expire_at?: string;
  link?: string;
  source?: string;
  relevance_score: number;
  match_reasons: string[];
  skill_match_count: number;
  title_similarity: number;
  is_viewed?: boolean; // NEW: Track if user has viewed this job
  is_saved?: boolean; // NEW: Track if user has saved this job
  interaction_count?: number; // NEW: How many times user interacted
  personalization_boost?: number; // NEW: Additional score from personalization
}

export interface RecommendationResponse {
  success: boolean;
  data?: {
    recommendations: ScoredJobPost[];
    total_count: number;
    new_jobs_count?: number; // NEW: Count of jobs user hasn't seen
    search_metadata: SearchMetadata;
    pagination?: PaginationMetadata; // NEW
    personalization_applied?: boolean; // NEW
  };
  error?: string;
}

export interface SearchMetadata {
  user_job_title: string;
  user_skills: string[];
  algorithm_version: string;
  filters_applied?: RecommendationFilters;
  execution_time_ms?: number;
  cache_hit?: boolean;
  personalization_factors?: string[];
}

export interface PaginationMetadata {
  current_page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

/**
 * User profile and personalization types
 */
export interface UserProfile extends Record<string, any> {
  id: string;
  userId: string;
  currentJobTitle?: string;
  desiredJobTitle?: string;
  skills?: string[];
  experienceLevel?: string;
  preferredLocations?: string[];
  preferredEmploymentTypes?: string[];
  salaryExpectation?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  excludedCompanies?: string[];
  preferences?: Record<string, any>;
  lastActive?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobInteraction {
  id: string;
  userId: string;
  jobId: string;
  interactionType: InteractionType;
  sessionId?: string;
  metadata?: {
    timeSpent?: number;
    scrollDepth?: number;
    source?: string;
  };
  createdAt?: string;
}

export type InteractionType =
  | "viewed"
  | "saved"
  | "dismissed"
  | "clicked_apply"
  | "shared"
  | "reported";

export interface SearchQuery {
  id: string;
  userId?: string;
  sessionId?: string;
  jobTitle: string;
  skills: string[];
  filters?: Record<string, any>;
  resultsCount?: number;
  resultsShown?: number;
  interactionCount?: number;
  createdAt?: string;
}

export interface RecommendationFeedback {
  id: string;
  userId: string;
  jobId: string;
  feedbackType: FeedbackType;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export type FeedbackType =
  | "thumbs_up"
  | "thumbs_down"
  | "not_relevant"
  | "salary_too_low"
  | "wrong_location"
  | "not_qualified"
  | "already_applied";

/**
 * Internal repository types
 */
export interface JobPost extends Record<string, unknown> {
  id: string;
  title: string;
  company_name?: string;
  description_text?: string;
  job_function?: string;
  posted_at?: Date;
  expire_at?: Date;
  location?: string;
  employment_type?: string;
  relevance_score?: number;
  fts_score?: number;
  title_similarity?: number;
  exact_skill_matches?: number;
  fuzzy_skill_matches?: number;
}

/**
 * Analytics and metrics types
 */
export interface UserEngagementMetrics {
  userId: string;
  totalSearches: number;
  totalViews: number;
  totalSaves: number;
  totalApplications: number;
  averageTimeSpent: number;
  topSearchedSkills: string[];
  preferredCompanies: string[];
  engagementScore: number;
}

export interface RecommendationMetrics {
  totalRecommendations: number;
  averageRelevanceScore: number;
  clickThroughRate: number;
  applicationRate: number;
  diversityScore: number; // Company/role diversity
  freshnessScore: number; // How recent the jobs are
}

/**
 * Cache types
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheKey {
  userId?: string;
  jobTitle: string;
  skills: string[];
  filters?: RecommendationFilters;
}
