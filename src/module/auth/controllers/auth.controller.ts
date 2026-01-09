import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import type {
  SignUpRequest,
  SignInRequest,
  UpdateUserRequest,
  UpdatePasswordRequest,
  UpdateProfileRequest,
} from "../types/auth.types";

/**
 * Authentication Controller
 * Handles HTTP requests for authentication and user management
 */
export class AuthController {
  constructor(private service: AuthService) {}

  /**
   * POST /api/auth/signup
   * Register a new user
   */
  signUp = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const request: SignUpRequest = req.body;

      // Validate request
      if (!request.email || !request.password) {
        res.status(400).json({
          success: false,
          error: "Email and password are required",
        });
        return;
      }

      const result = await this.service.signUp(request);

      // Set refresh token as httpOnly cookie
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * POST /api/auth/signin
   * Sign in existing user
   */
  signIn = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const request: SignInRequest = req.body;

      // Validate request
      if (!request.email || !request.password) {
        res.status(400).json({
          success: false,
          error: "Email and password are required",
        });
        return;
      }

      const result = await this.service.signIn(request);

      // Set refresh token as httpOnly cookie
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * POST /api/auth/refresh
   * Refresh access token
   */
  refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const refreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: "Refresh token required",
        });
        return;
      }

      const result = await this.service.refreshToken(refreshToken);

      // Update refresh token cookie
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
        },
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * POST /api/auth/signout
   * Sign out user
   */
  signOut = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        await this.service.signOut(refreshToken);
      }

      // Clear refresh token cookie
      res.clearCookie("refreshToken");

      res.status(200).json({
        success: true,
        message: "Signed out successfully",
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * POST /api/auth/signout-all
   * Sign out from all devices
   */
  signOutAll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      await this.service.signOutAll(userId);

      // Clear refresh token cookie
      res.clearCookie("refreshToken");

      res.status(200).json({
        success: true,
        message: "Signed out from all devices",
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * GET /api/auth/me
   * Get current user with profile
   */
  getCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const user = await this.service.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * PATCH /api/auth/user
   * Update user information
   */
  updateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const updates: UpdateUserRequest = req.body;
      const user = await this.service.updateUser(userId, updates);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * POST /api/auth/change-password
   * Change user password
   */
  changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const request: UpdatePasswordRequest = req.body;

      if (!request.currentPassword || !request.newPassword) {
        res.status(400).json({
          success: false,
          error: "Current password and new password are required",
        });
        return;
      }

      await this.service.updatePassword(userId, request);

      res.status(200).json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * PATCH /api/auth/profile
   * Update user profile
   */
  updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const updates: UpdateProfileRequest = req.body;
      const profile = await this.service.updateProfile(userId, updates);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * DELETE /api/auth/account
   * Delete user account
   */
  deleteAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const { password } = req.body;

      if (!password) {
        res.status(400).json({
          success: false,
          error: "Password is required to delete account",
        });
        return;
      }

      await this.service.deleteAccount(userId, password);

      // Clear refresh token cookie
      res.clearCookie("refreshToken");

      res.status(200).json({
        success: true,
        message: "Account deleted successfully",
      });
    } catch (error: any) {
      next(error);
    }
  };
}

// -------------------------------------------------------------------
// src/module/auth/routes/auth.route.ts