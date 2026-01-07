import { db } from '@/config/database';
import { referrals, creditTransactions, users } from '@/models/schema';
import { eq, desc, sql } from 'drizzle-orm';

export class ReferralRepository {
  async create(data: {
    referrerId: string;
    referredUserId: string;
    creditsEarned: number;
    milestoneBonus?: number;
  }) {
    const [referral] = await db.insert(referrals).values(data).returning();
    return referral;
  }

  async findByReferrer(referrerId: string) {
    return db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, referrerId))
      .orderBy(desc(referrals.createdAt));
  }

  async getReferralStats(userId: string) {
    const [stats] = await db
      .select({
        totalReferrals: sql<number>`count(*)::int`,
        totalEarnings: sql<number>`coalesce(sum(${referrals.creditsEarned} + ${referrals.milestoneBonus}), 0)::int`,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    return stats;
  }

  async getReferredUsers(referrerId: string) {
    return db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        createdAt: users.createdAt,
        creditsEarned: referrals.creditsEarned,
        milestoneBonus: referrals.milestoneBonus,
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referredUserId, users.id))
      .where(eq(referrals.referrerId, referrerId))
      .orderBy(desc(referrals.createdAt));
  }

  async getTotalReferralsCount(referrerId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(referrals)
      .where(eq(referrals.referrerId, referrerId));
    
    return result?.count || 0;
  }
}

export class CreditTransactionRepository {
  async create(data: {
    userId: string;
    amount: number;
    type: string;
    description?: string;
    referenceId?: string;
    balanceBefore: number;
    balanceAfter: number;
    metadata?: any;
  }) {
    const [transaction] = await db.insert(creditTransactions).values(data).returning();
    return transaction;
  }

  async findByUserId(userId: string, limit: number = 50) {
    return db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
  }

  async getUserCreditStats(userId: string) {
    const [stats] = await db
      .select({
        totalEarned: sql<number>`coalesce(sum(case when ${creditTransactions.amount} > 0 then ${creditTransactions.amount} else 0 end), 0)::int`,
        totalSpent: sql<number>`coalesce(sum(case when ${creditTransactions.amount} < 0 then abs(${creditTransactions.amount}) else 0 end), 0)::int`,
        transactionCount: sql<number>`count(*)::int`,
      })
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId));

    return stats;
  }

  async getCreditLeaderboard(limit: number = 10) {
    return db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        credits: users.credits,
        totalReferralEarnings: users.totalReferralEarnings,
        referralCount: users.referralCount,
      })
      .from(users)
      .orderBy(desc(users.credits))
      .limit(limit);
  }
}