// src/shared/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 * 
 * For production: Replace with actual JWT validation
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "No authentication token provided",
      });
      return;
    }

    const token = authHeader.substring(7);

    // TODO: Validate JWT token
    // For now, extract user ID from token directly (INSECURE - for demo only)
    // In production, use jsonwebtoken library:
    // const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Mock user for development
    (req as any).user = {
      id: token, // In production, this would be decoded from JWT
      email: "user@example.com",
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid authentication token",
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is present, but doesn't require it
 */
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      
      // Mock user for development
      (req as any).user = {
        id: token,
        email: "user@example.com",
      };
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};

// -------------------------------------------------------------------
// src/shared/middleware/rate-limit.middleware.ts


// -------------------------------------------------------------------
// src/shared/middleware/validation.middleware.ts

// -------------------------------------------------------------------
// src/shared/middleware/error.middleware.ts