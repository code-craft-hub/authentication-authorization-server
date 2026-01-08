import { Router } from 'express';
import { AdminController } from '@/controllers/admin.controller';
import { authenticate, authorize } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { adminUpdateUserSchema } from '@/utils/validators';
import { z } from 'zod';

const router: Router = Router();
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