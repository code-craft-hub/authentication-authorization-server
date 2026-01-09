import { Request, Response, NextFunction } from "express";
import {
  RecommendationResponse,
  PaginationMetadata,
  JobRecommendationRequest,
} from "../../../types";
import { JobRecommendationService } from "../services/job-recommendation.service";
import { v4 as uuidv4 } from "uuid";

/**
 * Controller for job recommendation endpoints
 * Handles HTTP requests and response formatting
 * 
 * @class JobRecommendationController
 */
export class JobRecommendationController {
  constructor(private service: JobRecommendationService) {}

  /**
   * POST /api/recommendations
   * Generate personalized job recommendations
   */
  getRecommendations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        jobTitle,
        skills,
        filters,
        excludeViewed = true,
        page = 1,
        pageSize = 20,
      } = req.body;

      // Validate required fields
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

      // Validate pagination
      if (page < 1 || pageSize < 1 || pageSize > 100) {
        res.status(400).json({
          success: false,
          error: "Invalid pagination parameters. page >= 1, pageSize 1-100",
        });
        return;
      }

      // Get user ID from auth middleware (if authenticated)
      const userId = (req as any).user?.id;

      // Generate or get session ID from cookie/header
      let sessionId = req.cookies?.sessionId || req.headers["x-session-id"];
      if (!sessionId) {
        sessionId = uuidv4();
        res.cookie("sessionId", sessionId, {
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          httpOnly: true,
        });
      }

      // Build request object
      const recommendationRequest: JobRecommendationRequest = {
        jobTitle,
        skills,
        userId,
        sessionId: sessionId as string,
        filters,
        excludeViewed,
        page,
        pageSize,
      };

      // Generate recommendations
      const result = await this.service.generateRecommendations(
        recommendationRequest
      );

      // Calculate pagination metadata
      const totalPages = Math.ceil(result.newJobsCount / pageSize);
      const paginationMetadata: PaginationMetadata = {
        current_page: page,
        page_size: pageSize,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
      };

      // Build response
      const response: RecommendationResponse = {
        success: true,
        data: {
          recommendations: result.recommendations,
          total_count: result.metadata.cache_hit
            ? result.recommendations.length
            : result.newJobsCount,
          new_jobs_count: userId ? result.newJobsCount : undefined,
          search_metadata: result.metadata,
          pagination: paginationMetadata,
          personalization_applied: !!userId && excludeViewed,
        },
      };

      // Update user profile asynchronously (fire and forget)
      if (userId) {
        this.service
          .updateUserProfile(userId, jobTitle, skills)
          .catch((err) =>
            console.error("Failed to update user profile:", err)
          );
      }

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/interactions
   * Track user interaction with a job (view, save, dismiss, etc.)
   */
  trackInteraction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { jobId, interactionType, metadata } = req.body;
      console.log("Tracking interaction:", { jobId, interactionType, metadata });
      // Validate required fields
      if (!jobId || typeof jobId !== "string") {
        res.status(400).json({
          success: false,
          error: "jobId is required and must be a string",
        });
        return;
      }

      if (!interactionType || typeof interactionType !== "string") {
        res.status(400).json({
          success: false,
          error: "interactionType is required and must be a string",
        });
        return;
      }

      // Validate interaction type
      const validTypes = [
        "viewed",
        "saved",
        "dismissed",
        "clicked_apply",
        "shared",
        "reported",
      ];
      if (!validTypes.includes(interactionType)) {
        res.status(400).json({
          success: false,
          error: `Invalid interactionType. Must be one of: ${validTypes.join(", ")}`,
        });
        return;
      }

      // Get user ID (required for this endpoint)
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      // Get session ID
      const sessionId = req.cookies?.sessionId || req.headers["x-session-id"];

      // Track interaction
      await this.service.trackJobInteraction(
        userId,
        jobId,
        interactionType,
        sessionId as string | undefined,
        metadata
      );

      res.status(200).json({
        success: true,
        message: "Interaction tracked successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/profile
   * Get user profile and preferences
   */
  getUserProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      // This would need to be implemented in the repository
      res.status(501).json({
        success: false,
        error: "Not implemented yet",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/feedback
   * Submit feedback on a recommendation
   */
  submitFeedback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { jobId, feedbackType, reason } = req.body;

      // Validate required fields
      if (!jobId || !feedbackType) {
        res.status(400).json({
          success: false,
          error: "jobId and feedbackType are required",
        });
        return;
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      // Track as a special interaction type
      await this.service.trackJobInteraction(
        userId,
        jobId,
        `feedback_${feedbackType}`,
        undefined,
        { reason }
      );

      res.status(200).json({
        success: true,
        message: "Feedback submitted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/stats
   * Get recommendation statistics (for admin/analytics)
   */
  getStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // This would return aggregated statistics
      // Implementation depends on requirements
      res.status(501).json({
        success: false,
        error: "Not implemented yet",
      });
    } catch (error) {
      next(error);
    }
  };
}