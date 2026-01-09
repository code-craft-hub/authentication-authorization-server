import { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
}

/**
 * In-memory rate limiting middleware
 * For production: Use Redis-backed rate limiting (express-rate-limit with Redis store)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitMiddleware = (options: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get identifier (IP or user ID)
    const identifier = (req as any).user?.id || req.ip || "unknown";
    const key = `${identifier}:${req.path}`;
    const now = Date.now();

    // Get or initialize counter
    let record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + options.windowMs,
      };
      requestCounts.set(key, record);
    }

    // Increment counter
    record.count++;

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", options.max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, options.max - record.count));
    res.setHeader("X-RateLimit-Reset", new Date(record.resetTime).toISOString());

    // Check if limit exceeded
    if (record.count > options.max) {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);