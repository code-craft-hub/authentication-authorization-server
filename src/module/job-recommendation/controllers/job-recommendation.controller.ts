import { Request, Response, NextFunction } from "express";
import { RecommendationResponse } from "../../../types";
import { JobRecommendationService } from "../services/job-recommendation.service";

export class JobRecommendationController {
  constructor(private service: JobRecommendationService) {}

  /**
   * Handle job recommendation request
   */
  getRecommendations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { jobTitle, skills } = req.body;

      // Validate request
      if (!jobTitle || typeof jobTitle !== "string") {
        res.status(400).json({
          success: false,
          error: "jobTitle is required and must be a string",
        });
        return;
      }

      if (!Array.isArray(skills) || skills.length === 0) {
        res.status(400).json({
          success: false,
          error: "skills is required and must be a non-empty array",
        });
        return;
      }

      // Get user ID if authenticated
      const userId = (req as any).user?.id;

      // Generate recommendations
      const recommendations = await this.service.generateRecommendations({
        jobTitle,
        skills,
        userId,
      });

      // Return response
      const response: RecommendationResponse = {
        success: true,
        data: {
          recommendations,
          total_count: recommendations.length,
          search_metadata: {
            user_job_title: jobTitle,
            user_skills: skills,
            algorithm_version: "2.0",
          },
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
