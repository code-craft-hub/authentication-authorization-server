import { ScoredJobPost } from "../../../types";
import { JobRecommendationRepository } from "../repositories/job-recommendation.repository";

/**
 * Personalization service for applying user-specific scoring boosts
 * Based on user engagement patterns and preferences
 * 
 * @class PersonalizationService
 */
export class PersonalizationService {
  constructor(private repository: JobRecommendationRepository) {}

  /**
   * Apply personalization boost to job recommendations
   * Based on user's past behavior and preferences
   */
  async applyPersonalizationBoost(
    jobs: ScoredJobPost[],
    userId: string
  ): Promise<ScoredJobPost[]> {
    try {
      // Get user engagement metrics
      const metrics = await this.repository.getUserEngagementMetrics(userId);

      // Apply boosts based on engagement patterns
      return jobs.map((job) => {
        let boost = 0;

        // Boost for preferred companies (user has viewed/saved jobs from these companies)
        if (
          job.company_name &&
          metrics.preferredCompanies.some(
            (c) => c.toLowerCase() === job.company_name!.toLowerCase()
          )
        ) {
          boost += 5;
        }

        // Boost for matching top skills from user's search history
        const jobText = `${job.title} ${job.description_text}`.toLowerCase();
        const matchingTopSkills = metrics.topSkills.filter((skill) =>
          jobText.includes(skill.toLowerCase())
        );

        if (matchingTopSkills.length > 0) {
          boost += Math.min(matchingTopSkills.length * 2, 8);
        }

        // Apply the boost
        const newScore = job.relevance_score + boost;

        return {
          ...job,
          relevance_score: Math.round(newScore * 100) / 100,
          personalization_boost: boost,
        };
      });
    } catch (error) {
      console.error("Failed to apply personalization boost:", error);
      return jobs; // Return original jobs if personalization fails
    }
  }

  /**
   * Calculate user engagement score (0-100)
   * Higher score indicates more active and engaged user
   */
  calculateEngagementScore(metrics: {
    totalSearches: number;
    totalViews: number;
    totalSaves: number;
    totalApplications: number;
    averageTimeSpent: number;
  }): number {
    const {
      totalSearches,
      totalViews,
      totalSaves,
      totalApplications,
      averageTimeSpent,
    } = metrics;

    // Weighted scoring system
    let score = 0;

    // Search activity (max 20 points)
    score += Math.min(totalSearches * 2, 20);

    // View activity (max 25 points)
    score += Math.min(totalViews, 25);

    // Save activity (max 25 points) - higher weight as it's a stronger signal
    score += Math.min(totalSaves * 2, 25);

    // Application activity (max 20 points) - strongest signal
    score += Math.min(totalApplications * 5, 20);

    // Time spent (max 10 points)
    score += Math.min(averageTimeSpent / 60, 10); // Normalize to minutes

    return Math.min(Math.round(score), 100);
  }

  /**
   * Recommend filters based on user behavior
   */
  async suggestFiltersForUser(userId: string): Promise<{
    locations?: string[];
    employmentTypes?: string[];
    companies?: string[];
  }> {
    const metrics = await this.repository.getUserEngagementMetrics(userId);

    return {
      companies: metrics.preferredCompanies.slice(0, 5),
    };
  }
}