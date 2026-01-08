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
