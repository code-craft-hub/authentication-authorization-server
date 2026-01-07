import { Request, Response, NextFunction } from 'express';
import { CryptoUtils } from '@/utils/crypto';
import { AuthRequest, UserRole } from '@/types';
import { cacheService } from '@/config/redis';
import { UserRepository } from '@/repositories/user.repository';

const userRepo = new UserRepository();

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = CryptoUtils.verifyAccessToken(token);

    // Check cache first
    let user = await cacheService.get(`user:${payload.userId}`);
    
    if (!user) {
      user = await userRepo.findById(payload.userId);
      if (!user) {
        res.status(401).json({ success: false, error: 'User not found' });
        return;
      }
      
      // Cache for 5 minutes
      await cacheService.set(`user:${payload.userId}`, user, 300);
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ success: false, error: `Account is ${user.status.toLowerCase()}` });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const optionalAuthenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = CryptoUtils.verifyAccessToken(token);
      req.user = payload;
    }
  } catch (error) {
    // Silently fail - optional auth
  }
  next();
};

// src/middlewares/validation.middleware.ts
import { z, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  };
};

// src/middlewares/error.middleware.ts
import { logger } from '@/utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};

// src/middlewares/ratelimit.middleware.ts
import rateLimit from 'express-rate-limit';
import { env } from '@/config/env';

export const createRateLimiter = (maxRequests: number = env.RATE_LIMIT_MAX_REQUESTS) => {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: maxRequests,
    message: { success: false, error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const authRateLimiter = createRateLimiter(5); // 5 requests per window for auth routes
export const apiRateLimiter = createRateLimiter(); // Default rate limit for API routes

// src/middlewares/request-logger.middleware.ts
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};