import { UserRepository } from '@/repositories/user.repository';
import { RefreshTokenRepository, SessionRepository } from '@/repositories/auth.repository';
import { CreditTransactionRepository } from '@/repositories/referral.repository';
import { AuditLogRepository } from '@/repositories/audit.repository';
import { ServiceResponse, PaginationParams, UserRole, AccountStatus } from '@/types';
import { cacheService } from '@/config/redis';

export class AdminService {
  private userRepo: UserRepository;
  private refreshTokenRepo: RefreshTokenRepository;
  private sessionRepo: SessionRepository;
  private creditRepo: CreditTransactionRepository;
  private auditLogRepo: AuditLogRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.refreshTokenRepo = new RefreshTokenRepository();
    this.sessionRepo = new SessionRepository();
    this.creditRepo = new CreditTransactionRepository();
    this.auditLogRepo = new AuditLogRepository();
  }

  async getAllUsers(params: PaginationParams & { search?: string; role?: string; status?: string }): Promise<ServiceResponse> {
    try {
      const users = await this.userRepo.findAll(params);
      return {
        success: true,
        data: users,
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async getUserById(userId: string): Promise<ServiceResponse> {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found', statusCode: 404 };
      }

      const activeSessions = await this.sessionRepo.getUserActiveSessions(userId);
      const creditStats = await this.creditRepo.getUserCreditStats(userId);

      return {
        success: true,
        data: {
          ...user,
          activeSessions: activeSessions.length,
          creditStats,
        },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async updateUser(
    userId: string,
    adminId: string,
    updates: {
      role?: UserRole;
      status?: AccountStatus;
      credits?: number;
      isEmailVerified?: boolean;
    }
  ): Promise<ServiceResponse> {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found', statusCode: 404 };
      }

      // Don't allow modifying super admins
      if (user.role === 'SUPER_ADMIN') {
        return { success: false, error: 'Cannot modify super admin accounts', statusCode: 403 };
      }

      const updatedUser = await this.userRepo.update(userId, updates);

      // If status changed, invalidate all sessions
      if (updates.status && updates.status !== user.status) {
        await this.signOutUser(userId, adminId);
      }

      // If credits manually adjusted, log transaction
      if (updates.credits !== undefined && updates.credits !== user.credits) {
        const difference = updates.credits - user.credits;
        await this.creditRepo.create({
          userId,
          amount: difference,
          type: 'ADMIN_ADJUSTMENT',
          description: `Admin adjustment by ${adminId}`,
          balanceBefore: user.credits,
          balanceAfter: updates.credits,
          metadata: { adminId },
        });
      }

      // Audit log
      await this.auditLogRepo.create({
        userId,
        adminId,
        action: 'PROFILE_UPDATE',
        entityType: 'user',
        entityId: userId,
        details: { updates, previousValues: user },
      });

      await cacheService.delete(`user:${userId}`);

      return {
        success: true,
        data: updatedUser,
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async suspendUser(userId: string, adminId: string, reason?: string): Promise<ServiceResponse> {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found', statusCode: 404 };
      }

      if (user.role === 'SUPER_ADMIN') {
        return { success: false, error: 'Cannot suspend super admin accounts', statusCode: 403 };
      }

      await this.userRepo.update(userId, { status: 'SUSPENDED' });
      await this.signOutUser(userId, adminId);

      await this.auditLogRepo.create({
        userId,
        adminId,
        action: 'ACCOUNT_SUSPENDED',
        entityType: 'user',
        entityId: userId,
        details: { reason },
      });

      return {
        success: true,
        data: { message: 'User suspended successfully' },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async banUser(userId: string, adminId: string, reason?: string): Promise<ServiceResponse> {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found', statusCode: 404 };
      }

      if (user.role === 'SUPER_ADMIN') {
        return { success: false, error: 'Cannot ban super admin accounts', statusCode: 403 };
      }

      await this.userRepo.update(userId, { status: 'BANNED' });
      await this.signOutUser(userId, adminId);

      await this.auditLogRepo.create({
        userId,
        adminId,
        action: 'ACCOUNT_BANNED',
        entityType: 'user',
        entityId: userId,
        details: { reason },
      });

      return {
        success: true,
        data: { message: 'User banned successfully' },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async signOutUser(userId: string, adminId: string): Promise<ServiceResponse> {
    try {
      await this.refreshTokenRepo.revokeAllUserTokens(userId);
      await this.sessionRepo.invalidateAllUserSessions(userId);
      await cacheService.delete(`user:${userId}`);

      await this.auditLogRepo.create({
        userId,
        adminId,
        action: 'LOGOUT',
        entityType: 'user',
        entityId: userId,
        details: { initiatedBy: 'admin' },
      });

      return {
        success: true,
        data: { message: 'User signed out successfully' },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async signOutAllUsers(adminId: string): Promise<ServiceResponse> {
    try {
      // This is a nuclear option - use with extreme caution
      const users = await this.userRepo.findAll({ page: 1, limit: 10000 });
      
      for (const user of users.data) {
        await this.refreshTokenRepo.revokeAllUserTokens(user.id);
        await this.sessionRepo.invalidateAllUserSessions(user.id);
        await cacheService.delete(`user:${user.id}`);
      }

      await this.auditLogRepo.create({
        adminId,
        action: 'LOGOUT',
        details: { type: 'sign_out_all_users', userCount: users.data.length },
      });

      return {
        success: true,
        data: { message: `Signed out ${users.data.length} users successfully` },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async deleteUser(userId: string, adminId: string): Promise<ServiceResponse> {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found', statusCode: 404 };
      }

      if (user.role === 'SUPER_ADMIN') {
        return { success: false, error: 'Cannot delete super admin accounts', statusCode: 403 };
      }

      await this.userRepo.softDelete(userId);
      await this.signOutUser(userId, adminId);

      await this.auditLogRepo.create({
        adminId,
        action: 'PROFILE_UPDATE',
        entityType: 'user',
        entityId: userId,
        details: { action: 'soft_delete' },
      });

      return {
        success: true,
        data: { message: 'User deleted successfully' },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async getDashboardStats(): Promise<ServiceResponse> {
    try {
      const userStats = await this.userRepo.getUserStats();
      const recentActivity = await this.auditLogRepo.getRecentActivity(20);

      return {
        success: true,
        data: {
          userStats,
          recentActivity,
        },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async getAuditLogs(params: PaginationParams & { userId?: string; action?: string }): Promise<ServiceResponse> {
    try {
      const logs = params.userId 
        ? await this.auditLogRepo.findByUserId(params.userId, params)
        : await this.auditLogRepo.findAll(params);

      return {
        success: true,
        data: logs,
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }
}