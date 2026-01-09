import "dotenv/config";
import { setupJobRecommendationApp } from "./app";

/**
 * Application entry point
 * Starts the Express server
 */
if (require.main === module) {
  const app = setupJobRecommendationApp();
  const PORT = process.env.PORT || 4005;
  const NODE_ENV = process.env.NODE_ENV || "development";

  const server = app.listen(PORT, () => {
    console.log("🚀 Job Recommendation Engine Started");
    console.log(`API: http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Don't exit in production, just log
    if (NODE_ENV === "development") {
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Exit on uncaught exceptions
    server.close(() => {
      process.exit(1);
    });
  });
}


