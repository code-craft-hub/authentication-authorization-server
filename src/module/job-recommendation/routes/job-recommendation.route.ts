import { Router } from "express";
import { JobRecommendationController } from "../controllers/job-recommendation.controller";
import { authMiddleware, optionalAuthMiddleware } from "../../../shared/middleware/auth.middleware";
import { rateLimitMiddleware } from "../../../shared/middleware/rate-limit.middleware";
import { validationMiddleware } from "../../../shared/middleware/validation.middleware";

/**
 * Create job recommendation routes
 * Includes authentication, rate limiting, and validation
 * 
 * @param controller - JobRecommendationController instance
 * @returns Express Router
 */
export function createJobRecommendationRoutes(
  controller: JobRecommendationController
): Router {
  const router = Router();

  /**
   * POST /api/recommendations
   * Generate personalized job recommendations
   * 
   * Authentication: Optional (personalized if authenticated)
   * Rate limit: 100 requests per 15 minutes per IP
   * 
   * Request body:
   * {
   *   "jobTitle": "Senior Software Engineer",
   *   "skills": ["JavaScript", "React", "Node.js", "PostgreSQL"],
   *   "filters": {
   *     "locations": ["San Francisco", "Remote"],
   *     "employmentTypes": ["full-time"],
   *     "salaryMin": 120000,
   *     "postedWithinDays": 30,
   *     "remoteOnly": false
   *   },
   *   "excludeViewed": true,
   *   "page": 1,
   *   "pageSize": 20
   * }
   * 
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "recommendations": [...],
   *     "total_count": 150,
   *     "new_jobs_count": 45,
   *     "search_metadata": {...},
   *     "pagination": {...},
   *     "personalization_applied": true
   *   }
   * }
   */
  router.post(
    "/recommendations",
    optionalAuthMiddleware, // Optional auth for personalization
    rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 100 }),
    validationMiddleware("recommendations"),
    controller.getRecommendations
  );

  /**
   * POST /api/interactions
   * Track user interaction with a job
   * 
   * Authentication: Required
   * Rate limit: 200 requests per 15 minutes per user
   * 
   * Request body:
   * {
   *   "jobId": "uuid-here",
   *   "interactionType": "viewed" | "saved" | "dismissed" | "clicked_apply" | "shared",
   *   "metadata": {
   *     "timeSpent": 45,
   *     "scrollDepth": 80,
   *     "source": "recommendation"
   *   }
   * }
   */
  router.post(
    "/interactions",
    authMiddleware, // Required auth
    rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 200 }),
    controller.trackInteraction
  );

  /**
   * POST /api/feedback
   * Submit feedback on a job recommendation
   * 
   * Authentication: Required
   * Rate limit: 50 requests per 15 minutes per user
   * 
   * Request body:
   * {
   *   "jobId": "uuid-here",
   *   "feedbackType": "thumbs_up" | "thumbs_down" | "not_relevant" | ...,
   *   "reason": "Optional explanation"
   * }
   */
  router.post(
    "/feedback",
    authMiddleware,
    rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 50 }),
    controller.submitFeedback
  );

  /**
   * GET /api/profile
   * Get user profile and recommendation preferences
   * 
   * Authentication: Required
   * Rate limit: 100 requests per 15 minutes per user
   */
  router.get(
    "/profile",
    authMiddleware,
    rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 100 }),
    controller.getUserProfile
  );

  /**
   * GET /api/stats
   * Get recommendation statistics (admin only)
   * 
   * Authentication: Required (admin)
   * Rate limit: 10 requests per minute
   */
  router.get(
    "/stats",
    authMiddleware,
    rateLimitMiddleware({ windowMs: 60 * 1000, max: 10 }),
    controller.getStats
  );

  return router;
}