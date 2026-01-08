import express,{ Express, Request, Response, NextFunction } from "express";
import { Pool } from "pg";
import { JobRecommendationModule } from "./module/job-recommendation/module";
export function setupJobRecommendationApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // ssl:
    //   process.env.NODE_ENV === "production"
    //     ? { rejectUnauthorized: false }
    //     : false,
  });

  // Initialize recommendation module
  const recommendationModule = new JobRecommendationModule(pool);
  app.use("/api", recommendationModule.getRouter());

  // Health check
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      method: req.method,
    });
  });

  // Error handling
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  });

  return app;
}