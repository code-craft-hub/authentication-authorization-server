import rateLimit from "express-rate-limit";
import { env } from "@/config/env";

export const createRateLimiter = (
  maxRequests: number = env.RATE_LIMIT_MAX_REQUESTS
) => {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: maxRequests,
    message: {
      success: false,
      error: "Too many requests, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const authRateLimiter = createRateLimiter(5); // 5 requests per window for auth routes
export const apiRateLimiter = createRateLimiter(); // Default rate limit for API routes
