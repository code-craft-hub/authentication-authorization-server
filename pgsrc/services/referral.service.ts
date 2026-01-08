import { UserRepository } from '@/repositories/user.repository';
import { ReferralRepository, CreditTransactionRepository } from '@/repositories/referral.repository';
import { AuditLogRepository } from '@/repositories/audit.repository';
import { env } from '@/config/env';
import { ServiceResponse, ReferralStats } from '@/types';
import { db } from '@/config/database';

export class ReferralService {
  private userRepo: UserRepository;
  private referralRepo: ReferralRepository;
  private creditRepo: CreditTransactionRepository;
  private auditLogRepo: AuditLogRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.referralRepo = new ReferralRepository();
    this.creditRepo = new CreditTransactionRepository();
    this.auditLogRepo = new AuditLogRepository();
  }

  async processReferral(referrerId: string, referredUserId: string): Promise<ServiceResponse> {
    try {
      const referrer = await this.userRepo.findById(referrerId);
      if (!referrer) {
        return { success: false, error: 'Referrer not found', statusCode: 404 };
      }

      // Base referral credits
      const baseCredits = env.BASE_REFERRAL_CREDITS;
      let totalCredits = baseCredits;
      let milestoneBonus = 0;

      // Increment referral count
      await this.userRepo.incrementReferralCount(referrerId);
      const newReferralCount = referrer.referralCount + 1;

      // Check for milestone bonus
      if (env.REFERRAL_MILESTONES.includes(newReferralCount)) {
        milestoneBonus = baseCredits * (env.MILESTONE_MULTIPLIER - 1);
        totalCredits += milestoneBonus;
      }

      // Add credits to referrer
      const updatedReferrer = await this.userRepo.addCredits(referrerId, totalCredits);
      if (!updatedReferrer) {
        return { success: false, error: 'Failed to add credits', statusCode: 500 };
      }

      // Create referral record
      await this.referralRepo.create({
        referrerId,
        referredUserId,
        creditsEarned: baseCredits,
        milestoneBonus,
      });

      // Create credit transaction
      await this.creditRepo.create({
        userId: referrerId,
        amount: totalCredits,
        type: milestoneBonus > 0 ? 'MILESTONE_BONUS' : 'REFERRAL',
        description: milestoneBonus > 0 
          ? `Referral bonus + ${newReferralCount} referrals milestone (${env.MILESTONE_MULTIPLIER}x)` 
          : 'Referral bonus',
        referenceId: referredUserId,
        balanceBefore: referrer.credits,
        balanceAfter: updatedReferrer.credits,
        metadata: { milestoneReached: newReferralCount, milestoneBonus },
      });

      // Audit log
      await this.auditLogRepo.create({
        userId: referrerId,
        action: 'REFERRAL_EARNED',
        entityType: 'referral',
        entityId: referredUserId,
        details: {
          baseCredits,
          milestoneBonus,
          totalCredits,
          newReferralCount,
        },
      });

      return {
        success: true,
        data: {
          creditsEarned: totalCredits,
          milestoneReached: milestoneBonus > 0,
          newReferralCount,
        },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async getReferralStats(userId: string): Promise<ServiceResponse<ReferralStats>> {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found', statusCode: 404 };
      }

      const referrals = await this.referralRepo.findByReferrer(userId);
      const stats = await this.referralRepo.getReferralStats(userId);

      // Find next milestone
      const nextMilestone = env.REFERRAL_MILESTONES.find(m => m > user.referralCount);
      const referralsToNextMilestone = nextMilestone ? nextMilestone - user.referralCount : 0;

      return {
        success: true,
        data: {
          totalReferrals: user.referralCount,
          activeReferrals: referrals.length,
          totalEarnings: user.totalReferralEarnings,
          nextMilestone,
          referralsToNextMilestone,
        },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async getReferredUsers(userId: string): Promise<ServiceResponse> {
    try {
      const referredUsers = await this.referralRepo.getReferredUsers(userId);

      return {
        success: true,
        data: referredUsers,
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async getCreditHistory(userId: string): Promise<ServiceResponse> {
    try {
      const transactions = await this.creditRepo.findByUserId(userId);
      const stats = await this.creditRepo.getUserCreditStats(userId);

      return {
        success: true,
        data: {
          transactions,
          stats,
        },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async getLeaderboard(limit: number = 10): Promise<ServiceResponse> {
    try {
      const leaderboard = await this.creditRepo.getCreditLeaderboard(limit);

      return {
        success: true,
        data: leaderboard,
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }
}