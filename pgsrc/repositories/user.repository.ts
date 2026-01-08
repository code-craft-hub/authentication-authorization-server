import { db } from '@/config/database';
import { users, refreshTokens, sessions } from '@/models/schema';
import { eq, and, isNull, desc, sql, ilike, or } from 'drizzle-orm';
import { PaginationParams, PaginatedResponse, User } from '@/types';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);
    return user || null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.googleId, googleId), isNull(users.deletedAt)))
      .limit(1);
    return user || null;
  }

  async findByReferralCode(referralCode: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.referralCode, referralCode), isNull(users.deletedAt)))
      .limit(1);
    return user || null;
  }

  async create(data: Partial<User>): Promise<User> {
    const [user] = await db.insert(users).values(data as any).returning();
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return user || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async findAll(params: PaginationParams & { search?: string; role?: string; status?: string }): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, role, status } = params;
    const offset = (page - 1) * limit;

    let conditions = [isNull(users.deletedAt)];
    
    if (search) {
      conditions.push(
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`)
        ) as any
      );
    }
    
    if (role) {
      conditions.push(eq(users.role, role as any));
    }
    
    if (status) {
      conditions.push(eq(users.status, status as any));
    }

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(...conditions));

    const total = totalResult?.count || 0;

    const data = await db
      .select()
      .from(users)
      .where(and(...conditions))
      .orderBy(sortOrder === 'asc' ? sql`${users[sortBy as keyof typeof users]} asc` : sql`${users[sortBy as keyof typeof users]} desc`)
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async incrementReferralCount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        referralCount: sql`${users.referralCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async addCredits(userId: string, amount: number): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        credits: sql`${users.credits} + ${amount}`,
        totalReferralEarnings: sql`${users.totalReferralEarnings} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user || null;
  }

  async deductCredits(userId: string, amount: number): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        credits: sql`${users.credits} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), sql`${users.credits} >= ${amount}`))
      .returning();
    return user || null;
  }

  async updateLastLogin(userId: string, ipAddress: string): Promise<void> {
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserStats() {
    const [stats] = await db
      .select({
        totalUsers: sql<number>`count(*)::int`,
        activeUsers: sql<number>`count(*) filter (where ${users.status} = 'ACTIVE')::int`,
        suspendedUsers: sql<number>`count(*) filter (where ${users.status} = 'SUSPENDED')::int`,
        bannedUsers: sql<number>`count(*) filter (where ${users.status} = 'BANNED')::int`,
        verifiedUsers: sql<number>`count(*) filter (where ${users.isEmailVerified} = true)::int`,
      })
      .from(users)
      .where(isNull(users.deletedAt));

    return stats;
  }
}