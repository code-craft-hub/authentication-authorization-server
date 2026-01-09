// src/module/job-recommendation/module.ts
import { Router } from "express";
import { JobRecommendationRepository } from "./repositories/job-recommendation.repository";
import { JobRecommendationService } from "./services/job-recommendation.service";
import { JobRecommendationController } from "./controllers/job-recommendation.controller";
import { Pool } from "pg";
import { createJobRecommendationRoutes } from "./routes/job-recommendation.route";
import { CacheService } from "../../shared/services/cache.service";

/**
 * Job Recommendation Module
 * Encapsulates all job recommendation functionality
 * Follows modular monolith architecture with clear layer separation
 * 
 * Layers:
 * - Routes: HTTP endpoint definitions
 * - Controllers: Request/response handling
 * - Services: Business logic and orchestration
 * - Repositories: Data access layer
 * 
 * @class JobRecommendationModule
 */
export class JobRecommendationModule {
  private repository: JobRecommendationRepository;
  private cacheService: CacheService;
  private service: JobRecommendationService;
  private controller: JobRecommendationController;
  private router: Router;

  constructor(dbPool: Pool) {
    // Initialize layers with dependency injection (bottom-up)
    this.repository = new JobRecommendationRepository(dbPool);
    this.cacheService = new CacheService(300); // 5 min default TTL
    this.service = new JobRecommendationService(
      this.repository,
      this.cacheService
    );
    this.controller = new JobRecommendationController(this.service);
    this.router = createJobRecommendationRoutes(this.controller);
  }

  /**
   * Get the router for mounting in Express app
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Get service instance (for testing or direct access)
   */
  getService(): JobRecommendationService {
    return this.service;
  }

  /**
   * Get repository instance (for testing or migrations)
   */
  getRepository(): JobRecommendationRepository {
    return this.repository;
  }

  /**
   * Get cache service instance
   */
  getCacheService(): CacheService {
    return this.cacheService;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.cacheService.destroy();
    await this.repository.close();
  }
}