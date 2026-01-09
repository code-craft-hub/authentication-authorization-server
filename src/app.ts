// src/app.ts - UPDATED VERSION WITH AUTH MODULE
import express, { Express, Request, Response, NextFunction } from "express";
import { Pool } from "pg";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import { JobRecommendationModule } from "./module/job-recommendation/module";
import { AuthModule } from "./module/auth/module";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./shared/middleware/error.middleware";

/**
 * Setup and configure Express application
 * with all necessary middleware and routes
 */
export function setupJobRecommendationApp(): Express {
  const app = express();

  // ============================================
  // Security & Performance Middleware
  // ============================================
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
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
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on("connect", () => {
    console.log("✓ Database connected");
  });

  pool.on("error", (err) => {
    console.error("Database connection error:", err);
  });

  // ============================================
  // Initialize Modules
  // ============================================
  const authModule = new AuthModule(pool);
  const recommendationModule = new JobRecommendationModule(pool);
  
  // Mount module routes
  app.use("/api/auth", authModule.getRouter());
  app.use("/api", recommendationModule.getRouter());

  // ============================================
  // Health Check Endpoints
  // ============================================
  app.get("/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: "connected",
        modules: {
          auth: "active",
          recommendations: "active",
        },
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
      modules: {
        auth: {
          endpoints: {
            signup: "POST /api/auth/signup",
            signin: "POST /api/auth/signin",
            refresh: "POST /api/auth/refresh",
            signout: "POST /api/auth/signout",
            me: "GET /api/auth/me",
            updateUser: "PATCH /api/auth/user",
            updateProfile: "PATCH /api/auth/profile",
            changePassword: "POST /api/auth/change-password",
            deleteAccount: "DELETE /api/auth/account",
          },
        },
        recommendations: {
          endpoints: {
            recommendations: "POST /api/recommendations",
            interactions: "POST /api/interactions",
            feedback: "POST /api/feedback",
          },
        },
      },
      features: [
        "Email/Password Authentication",
        "JWT with Refresh Tokens",
        "User Profile Management",
        "Personalized Job Recommendations",
        "View Tracking & History",
        "Interaction Analytics",
      ],
    });
  });

  // ============================================
  // Error Handling
  // ============================================
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  // ============================================
  // Graceful Shutdown
  // ============================================
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully...");
    
    try {
      await authModule.cleanup();
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