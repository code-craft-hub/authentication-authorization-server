import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/request-logger.middleware';
import { apiRateLimiter } from './middlewares/ratelimit.middleware';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Rate limiting for API routes
  app.use(`/api/${env.API_VERSION}`, apiRateLimiter);

  // API routes
  app.use(`/api/${env.API_VERSION}`, routes);

  // Root route
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Enterprise Authentication & Referral API',
      version: env.API_VERSION,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      path: req.path,
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
};

// src/index.ts
import { createApp } from './app';
import { env } from './config/env';
import { dbConnection } from './config/database';
import { redisConnection } from './config/redis';
import { logger } from './utils/logger';
import { initializeSuperAdmin } from './utils/seed';

const startServer = async () => {
  try {
    // Check database connection
    const dbHealthy = await dbConnection.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database health check failed');
    }

    // Check Redis connection
    const redisHealthy = await redisConnection.healthCheck();
    if (!redisHealthy) {
      throw new Error('Redis health check failed');
    }

    // Initialize super admin if configured
    if (env.SUPER_ADMIN_EMAIL && env.SUPER_ADMIN_PASSWORD) {
      await initializeSuperAdmin();
    }

    // Create and start Express app
    const app = createApp();
    
    const server = app.listen(env.PORT, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Enterprise Auth System - FAANG+ Standard             ║
║                                                            ║
║   Environment: ${env.NODE_ENV.padEnd(45)}║
║   Port:        ${String(env.PORT).padEnd(45)}║
║   API Version: ${env.API_VERSION.padEnd(45)}║
║                                                            ║
║   🔗 Server:    http://localhost:${env.PORT.toString().padEnd(29)}║
║   📚 API Docs:  http://localhost:${env.PORT}/api/${env.API_VERSION.padEnd(17)}║
║                                                            ║
║   ✅ Database:  Connected                                  ║
║   ✅ Redis:     Connected                                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await dbConnection.close();
          await redisConnection.close();
          logger.info('All connections closed. Exiting process.');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});