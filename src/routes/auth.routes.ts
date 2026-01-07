import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { registerSchema, loginSchema } from '@/utils/validators';
import { authRateLimiter } from '@/middlewares/ratelimit.middleware';
import { z } from 'zod';

const router: Router = Router();
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


