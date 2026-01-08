import { Router } from "express";
import { JobRecommendationController } from "../controllers/job-recommendation.controller";

export function createJobRecommendationRoutes(
  controller: JobRecommendationController
): Router {
  const router = Router();

  /**
   * POST /api/recommendations
   * Generate job recommendations based on user profile
   *
   * Request body:
   * {
   *   "jobTitle": "Senior Software Engineer",
   *   "skills": ["JavaScript", "React", "Node.js", "PostgreSQL"]
   * }
   */
  router.post("/recommendations", controller.getRecommendations);

  return router;
}
