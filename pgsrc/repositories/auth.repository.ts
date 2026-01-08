import { db } from '@/config/database';
import { 
  refreshTokens, 
  sessions, 
  emailVerificationTokens, 
  passwordResetTokens 
} from '@/models/schema';
import { eq, and, gt, lt } from 'drizzle-orm';

export class RefreshTokenRepository {
  async create(data: {
    userId: string;
    token: string;
    deviceInfo?: any;
    expiresAt: Date;
  }) {
    const [refreshToken] = await db.insert(refreshTokens).values(data).returning();
    return refreshToken;
  }

  async findByToken(token: string) {
    const [refreshToken] = await db
      .select()
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.token, token),
        eq(refreshTokens.isRevoked, false),
        gt(refreshTokens.expiresAt, new Date())
      ))
      .limit(1);
    return refreshToken || null;
  }

  async revokeToken(token: string): Promise<boolean> {
    const result = await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.token, token))
      .returning();
    return result.length > 0;
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));
  }

  async deleteExpiredTokens(): Promise<void> {
    await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()));
  }
}

export class SessionRepository {
  async create(data: {
    userId: string;
    sessionToken: string;
    deviceInfo?: any;
    expiresAt: Date;
  }) {
    const [session] = await db.insert(sessions).values(data).returning();
    return session;
  }

  async findByToken(sessionToken: string) {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.sessionToken, sessionToken),
        eq(sessions.isActive, true),
        gt(sessions.expiresAt, new Date())
      ))
      .limit(1);
    return session || null;
  }

  async updateActivity(sessionToken: string): Promise<void> {
    await db
      .update(sessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(sessions.sessionToken, sessionToken));
  }

  async invalidateSession(sessionToken: string): Promise<boolean> {
    const result = await db
      .update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.sessionToken, sessionToken))
      .returning();
    return result.length > 0;
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    await db
      .update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.userId, userId));
  }

  async getUserActiveSessions(userId: string) {
    return db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.userId, userId),
        eq(sessions.isActive, true),
        gt(sessions.expiresAt, new Date())
      ));
  }

  async deleteExpiredSessions(): Promise<void> {
    await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()));
  }
}

export class EmailVerificationRepository {
  async create(userId: string, token: string, expiresAt: Date) {
    const [verificationToken] = await db
      .insert(emailVerificationTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return verificationToken;
  }

  async findByToken(token: string) {
    const [verificationToken] = await db
      .select()
      .from(emailVerificationTokens)
      .where(and(
        eq(emailVerificationTokens.token, token),
        gt(emailVerificationTokens.expiresAt, new Date())
      ))
      .limit(1);
    return verificationToken || null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, userId));
  }

  async deleteExpired(): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(lt(emailVerificationTokens.expiresAt, new Date()));
  }
}

export class PasswordResetRepository {
  async create(userId: string, token: string, expiresAt: Date) {
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return resetToken;
  }

  async findByToken(token: string) {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.isUsed, false),
        gt(passwordResetTokens.expiresAt, new Date())
      ))
      .limit(1);
    return resetToken || null;
  }

  async markAsUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ isUsed: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
  }

  async deleteExpired(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, new Date()));
  }
}