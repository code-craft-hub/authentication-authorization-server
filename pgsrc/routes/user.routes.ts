import { Router } from 'express';
import { UserRepository } from '@/repositories/user.repository';
import { ReferralService } from '@/services/referral.service';
import { authenticate } from '@/middlewares/auth.middleware';
import { AuthRequest } from '@/types';

const router: Router = Router();
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