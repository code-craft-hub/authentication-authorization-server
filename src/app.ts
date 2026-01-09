// src/app.ts
import express, { Express, Request, Response, NextFunction } from "express";
import { Pool } from "pg";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import { JobRecommendationModule } from "./module/job-recommendation/module";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./shared/middleware/error.middleware";

/**
 * Setup and configure Express application
 * with all necessary middleware and routes
 * 
 * @returns Configured Express application
 */
export function setupJobRecommendationApp(): Express {
  const app = express();

  // ============================================
  // Security & Performance Middleware
  // ============================================
  
  // Helmet: Security headers
  app.use(helmet());
  
  // Compression: Gzip responses
  app.use(compression());

  // Body parsers
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  
  // Cookie parser for session management
  app.use(cookieParser());

  // ============================================
  // CORS Configuration
  // ============================================
  app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];
    const origin = req.headers.origin;

    if (allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))) {
      res.header("Access-Control-Allow-Origin", origin || "*");
    }

    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Session-Id"
    );
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // ============================================
  // Request Logging Middleware
  // ============================================
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
      );
    });
    
    next();
  });

  // ============================================
  // Database Connection
  // ============================================
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
    // Connection pool configuration
    max: 20, // Maximum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test database connection
  pool.on("connect", () => {
    console.log("✓ Database connected");
  });

  pool.on("error", (err) => {
    console.error("Database connection error:", err);
  });

  // ============================================
  // Initialize Modules
  // ============================================
  const recommendationModule = new JobRecommendationModule(pool);
  
  // Mount module routes
  app.use("/api", recommendationModule.getRouter());

  // ============================================
  // Health Check Endpoints
  // ============================================
  app.get("/health", async (req, res) => {
    try {
      // Check database connection
      await pool.query("SELECT 1");
      
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: "connected",
        cache: recommendationModule.getCacheService().getStats(),
      });
    } catch (error) {
      res.status(503).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: "Database connection failed",
      });
    }
  });

  app.get("/", (req, res) => {
    res.json({
      name: "Job Recommendation Engine API",
      version: "3.0",
      algorithm: "Multi-strategy hybrid matching with personalization",
      features: [
        "Full-text search",
        "Trigram similarity matching",
        "Skill-based matching",
        "Personalization engine",
        "View tracking & history",
        "User profiles",
        "Interaction analytics",
        "Response caching",
      ],
      endpoints: {
        recommendations: "POST /api/recommendations",
        interactions: "POST /api/interactions",
        feedback: "POST /api/feedback",
        profile: "GET /api/profile",
        health: "GET /health",
      },
      documentation: "/api-docs", // TODO: Add Swagger/OpenAPI
    });
  });

  // ============================================
  // Error Handling
  // ============================================
  
  // 404 handler (must be before error middleware)
  app.use(notFoundMiddleware);
  
  // Global error handler (must be last)
  app.use(errorMiddleware);

  // ============================================
  // Graceful Shutdown
  // ============================================
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully...");
    
    try {
      await recommendationModule.cleanup();
      await pool.end();
      console.log("Cleanup completed");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  });

  return app;
}