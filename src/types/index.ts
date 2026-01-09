export interface JobRecommendationRequest {
  jobTitle: string;
  skills: string[];
  userId?: string;
}

export interface JobPost {
  id: string;
  title: string;
  company_name: string;
  company_logo: string | null;
  location: string;
  salary_info: any;
  posted_at: Date;
  description_text: string;
  description_html: string;
  apply_url: string;
  job_function: string | null;
  employment_type: string | null;
  expire_at: Date | null;
  link: string;
  source: string;
}

export interface ScoredJobPost extends JobPost {
  relevance_score: number;
  match_reasons: string[];
  skill_match_count: number;
  title_similarity: number;
}

export interface RecommendationResponse {
  success: boolean;
  data: {
    recommendations: ScoredJobPost[];
    total_count: number;
    search_metadata: {
      user_job_title: string;
      user_skills: string[];
      algorithm_version: string;
    };
  };
}

