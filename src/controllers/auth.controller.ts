import { Request, Response } from 'express';
import { AuthService } from '@/services/auth.service';
import { ReferralService } from '@/services/referral.service';
import { AuthRequest } from '@/types';

export class AuthController {
  private authService: AuthService;
  private referralService: ReferralService;

  constructor() {
    this.authService = new AuthService();
    this.referralService = new ReferralService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName, referralCode } = req.body;
      
      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
      };

      const result = await this.authService.register(
        { email, password, firstName, lastName, referralCode },
        deviceInfo
      );

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      // Process referral if referral code was provided
      if (referralCode && result.data?.user) {
        await this.referralService.processReferral(
          result.data.user.referredById,
          result.data.user.id
        );
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result.data,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      
      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
      };

      const result = await this.authService.login(email, password, deviceInfo);

      if (!result.success) {
        res.status(result.statusCode || 401).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result.data,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        res.status(400).json({ success: false, error: 'ID token is required' });
        return;
      }

      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
      };

      const result = await this.authService.googleLogin(idToken, deviceInfo);

      if (!result.success) {
        res.status(result.statusCode || 401).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Google authentication successful',
        data: result.data,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        res.status(400).json({ success: false, error: 'Refresh token is required' });
        return;
      }

      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
      };

      const result = await this.authService.refreshToken(refreshToken, deviceInfo);

      if (!result.success) {
        res.status(result.statusCode || 401).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result.data,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  logout = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const userId = req.user!.userId;

      const result = await this.authService.logout(userId, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  logoutAllSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const result = await this.authService.logoutAllSessions(userId);

      res.status(200).json({
        success: true,
        message: 'Logged out from all sessions successfully',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      // Implementation in user.controller
      res.status(200).json({
        success: true,
        data: { userId }, // Would fetch full user details
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}