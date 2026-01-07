import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { registerSchema, loginSchema } from '@/utils/validators';
import { authRateLimiter } from '@/middlewares/ratelimit.middleware';
import { z } from 'zod';

const router = Router();
const authController = new AuthController();

router.post(
  '/register',
  authRateLimiter,
  validate(z.object({ body: registerSchema })),
  authController.register
);

router.post(
  '/login',
  authRateLimiter,
  validate(z.object({ body: loginSchema })),
  authController.login
);

router.post(
  '/google',
  authRateLimiter,
  authController.googleAuth
);

router.post(
  '/refresh',
  authRateLimiter,
  authController.refreshToken
);

router.post(
  '/logout',
  authenticate,
  authController.logout
);

router.post(
  '/logout-all',
  authenticate,
  authController.logoutAllSessions
);

export default router;

// src/routes/admin.routes.ts
import { Router } from 'express';
import { AdminController } from '@/controllers/admin.controller';
import { authenticate, authorize } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { adminUpdateUserSchema } from '@/utils/validators';
import { z } from 'zod';

const router = Router();
const adminController = new AdminController();

// All admin routes require authentication and ADMIN or SUPER_ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.patch(
  '/users/:userId',
  validate(z.object({ body: adminUpdateUserSchema })),
  adminController.updateUser
);
router.delete('/users/:userId', adminController.deleteUser);

// User actions
router.post('/users/:userId/suspend', adminController.suspendUser);
router.post('/users/:userId/ban', adminController.banUser);
router.post('/users/:userId/sign-out', adminController.signOutUser);

// Super admin only - sign out all users
router.post(
  '/sign-out-all',
  authorize('SUPER_ADMIN'),
  adminController.signOutAllUsers
);

// Dashboard and analytics
router.get('/dashboard', adminController.getDashboardStats);
router.get('/audit-logs', adminController.getAuditLogs);

export default router;

// src/routes/user.routes.ts
import { Router } from 'express';
import { UserRepository } from '@/repositories/user.repository';
import { ReferralService } from '@/services/referral.service';
import { authenticate } from '@/middlewares/auth.middleware';
import { AuthRequest } from '@/types';

const router = Router();
const userRepo = new UserRepository();
const referralService = new ReferralService();

router.use(authenticate);

// Get current user profile
router.get('/profile', async (req: AuthRequest, res) => {
  try {
    const user = await userRepo.findById(req.user!.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    
    const { passwordHash, ...sanitized } = user;
    res.json({ success: true, data: sanitized });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update profile
router.patch('/profile', async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, displayName } = req.body;
    const user = await userRepo.update(req.user!.userId, {
      firstName,
      lastName,
      displayName,
    });
    
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    
    const { passwordHash, ...sanitized } = user;
    res.json({ success: true, data: sanitized });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get referral stats
router.get('/referrals/stats', async (req: AuthRequest, res) => {
  try {
    const result = await referralService.getReferralStats(req.user!.userId);
    res.status(result.statusCode || 200).json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get referred users
router.get('/referrals/users', async (req: AuthRequest, res) => {
  try {
    const result = await referralService.getReferredUsers(req.user!.userId);
    res.status(result.statusCode || 200).json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get credit history
router.get('/credits/history', async (req: AuthRequest, res) => {
  try {
    const result = await referralService.getCreditHistory(req.user!.userId);
    res.status(result.statusCode || 200).json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req: AuthRequest, res) => {
  try {
    const { limit = 10 } = req.query;
    const result = await referralService.getLeaderboard(Number(limit));
    res.status(result.statusCode || 200).json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

// src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

export default router;