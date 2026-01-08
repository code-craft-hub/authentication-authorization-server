import { Response } from 'express';
import { AdminService } from '@/services/admin.service';
import { AuthRequest } from '@/types';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder, search, role, status } = req.query;

      const result = await this.adminService.getAllUsers({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
        role: role as string,
        status: status as string,
      });

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const result = await this.adminService.getUserById(userId);

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const adminId = req.user!.userId;
      const updates = req.body;

      const result = await this.adminService.updateUser(userId, adminId, updates);

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        error: result.error,
        message: result.success ? 'User updated successfully' : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  suspendUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.userId;

      const result = await this.adminService.suspendUser(userId, adminId, reason);

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  banUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.userId;

      const result = await this.adminService.banUser(userId, adminId, reason);

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  signOutUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const adminId = req.user!.userId;

      const result = await this.adminService.signOutUser(userId, adminId);

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  signOutAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const adminId = req.user!.userId;

      // Extra confirmation required for this nuclear option
      const { confirmation } = req.body;
      if (confirmation !== 'SIGN_OUT_ALL_USERS') {
        res.status(400).json({
          success: false,
          error: 'Confirmation required. Send { confirmation: "SIGN_OUT_ALL_USERS" }',
        });
        return;
      }

      const result = await this.adminService.signOutAllUsers(adminId);

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const adminId = req.user!.userId;

      const result = await this.adminService.deleteUser(userId, adminId);

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await this.adminService.getDashboardStats();

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 50, userId, action } = req.query;

      const result = await this.adminService.getAuditLogs({
        page: Number(page),
        limit: Number(limit),
        userId: userId as string,
        action: action as string,
      });

      res.status(result.statusCode || 200).json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}