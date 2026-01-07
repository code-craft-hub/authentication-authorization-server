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

// 
