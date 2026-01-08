import { Router } from "express";
import { JobRecommendationRepository } from "./repositories/job-recommendation.repository";
import { JobRecommendationService } from "./services/job-recommendation.service";
import { JobRecommendationController } from "./controllers/job-recommendation.controller";
import { Pool } from "pg";
import { createJobRecommendationRoutes } from "./routes/job-recommendation.route";

export class JobRecommendationModule {
  private repository: JobRecommendationRepository;
  private service: JobRecommendationService;
  private controller: JobRecommendationController;
  private router: Router;

  constructor(dbPool: Pool) {
    // Initialize layers with dependency injection
    this.repository = new JobRecommendationRepository(dbPool);
    this.service = new JobRecommendationService(this.repository);
    this.controller = new JobRecommendationController(this.service);
    this.router = createJobRecommendationRoutes(this.controller);
  }

  getRouter(): Router {
    return this.router;
  }
}