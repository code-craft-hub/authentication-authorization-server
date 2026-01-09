import { Router } from "express";
import { Pool } from "pg";
import { AuthRepository } from "./repositories/auth.repository";
import { AuthService } from "./services/auth.service";
import { AuthController } from "./controllers/auth.controller";
import { createAuthRoutes } from "./routes/auth.route";

/**
 * Authentication Module
 * Handles user authentication, registration, and profile management
 * 
 * @class AuthModule
 */
export class AuthModule {
  private repository: AuthRepository;
  private service: AuthService;
  private controller: AuthController;
  private router: Router;

  constructor(dbPool: Pool) {
    // Initialize layers with dependency injection (bottom-up)
    this.repository = new AuthRepository(dbPool);
    this.service = new AuthService(this.repository);
    this.controller = new AuthController(this.service);
    this.router = createAuthRoutes(this.controller);
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
  getService(): AuthService {
    return this.service;
  }

  /**
   * Get repository instance (for testing or migrations)
   */
  getRepository(): AuthRepository {
    return this.repository;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.repository.close();
  }
}