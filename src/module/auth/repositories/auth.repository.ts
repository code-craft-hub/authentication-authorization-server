// src/module/auth/repositories/auth.repository.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import type {
  User,
  UserProfile,
  RefreshToken,
  UpdateUserRequest,
  UpdateProfileRequest,
} from "../types/auth.types";
import { v4 as uuidv4 } from "uuid";

/**
 * Authentication Repository
 * Handles all database operations for authentication and user management
 */
export class AuthRepository {
  private db: ReturnType<typeof drizzle>;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.db = drizzle(pool);
  }

  /**
   * Create a new user
   */
  async createUser(
    email: string,
    passwordHash: string,
    firstName?: string,
    lastName?: string,
    referredBy?: string
  ): Promise<User> {
    const result = await this.db.execute<User>(sql`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, 
        referral_code, referred_by
      ) VALUES (
        ${uuidv4()},
        ${email},
        ${passwordHash},
        ${firstName || null},
        ${lastName || null},
        ${await this.generateUniqueReferralCode()},
        ${referredBy || null}
      )
      RETURNING *
    `);

    return result.rows[0];
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    const result = await this.db.execute<User>(sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `);

    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<User | null> {
    const result = await this.db.execute<User>(sql`
      SELECT * FROM users WHERE id = ${userId} LIMIT 1
    `);

    return result.rows[0] || null;
  }

  /**
   * Find user by referral code
   */
  async findUserByReferralCode(code: string): Promise<User | null> {
    const result = await this.db.execute<User>(sql`
      SELECT * FROM users WHERE referral_code = ${code} LIMIT 1
    `);

    return result.rows[0] || null;
  }

  /**
   * Update user information
   */
  async updateUser(
    userId: string,
    updates: UpdateUserRequest
  ): Promise<User | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.firstName !== undefined) {
      setClauses.push(`first_name = $${paramIndex++}`);
      values.push(updates.firstName);
    }
    if (updates.lastName !== undefined) {
      setClauses.push(`last_name = $${paramIndex++}`);
      values.push(updates.lastName);
    }
    if (updates.email !== undefined) {
      setClauses.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }

    if (setClauses.length === 0) {
      return this.findUserById(userId);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await this.pool.query<User>(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE users 
      SET password_hash = ${newPasswordHash}, updated_at = NOW()
      WHERE id = ${userId}
    `);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE users SET last_login = NOW() WHERE id = ${userId}
    `);
  }

  /**
   * Delete user account
   */
  async deleteUser(userId: string): Promise<void> {
    await this.db.execute(sql`
      DELETE FROM users WHERE id = ${userId}
    `);
  }

  /**
   * Create or update user profile
   */
  async upsertProfile(
    userId: string,
    profile: UpdateProfileRequest
  ): Promise<UserProfile> {
    const result = await this.db.execute<UserProfile>(sql`
      INSERT INTO user_profiles (
        user_id, current_job_title, desired_job_title, skills, 
        experience_level, preferred_locations, preferred_employment_types,
        salary_expectation, excluded_companies, bio, years_of_experience,
        education, certifications, preferences
      ) VALUES (
        ${userId},
        ${profile.currentJobTitle || null},
        ${profile.desiredJobTitle || null},
        ${profile.skills ? sql`${JSON.stringify(profile.skills)}::jsonb` : null},
        ${profile.experienceLevel || null},
        ${profile.preferredLocations ? sql`${JSON.stringify(profile.preferredLocations)}::jsonb` : null},
        ${profile.preferredEmploymentTypes ? sql`${JSON.stringify(profile.preferredEmploymentTypes)}::jsonb` : null},
        ${profile.salaryExpectation ? sql`${JSON.stringify(profile.salaryExpectation)}::jsonb` : null},
        ${profile.excludedCompanies ? sql`${JSON.stringify(profile.excludedCompanies)}::jsonb` : null},
        ${profile.bio || null},
        ${profile.yearsOfExperience || null},
        ${profile.education ? sql`${JSON.stringify(profile.education)}::jsonb` : null},
        ${profile.certifications ? sql`${JSON.stringify(profile.certifications)}::jsonb` : null},
        ${profile.preferences ? sql`${JSON.stringify(profile.preferences)}::jsonb` : null}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        current_job_title = COALESCE(EXCLUDED.current_job_title, user_profiles.current_job_title),
        desired_job_title = COALESCE(EXCLUDED.desired_job_title, user_profiles.desired_job_title),
        skills = COALESCE(EXCLUDED.skills, user_profiles.skills),
        experience_level = COALESCE(EXCLUDED.experience_level, user_profiles.experience_level),
        preferred_locations = COALESCE(EXCLUDED.preferred_locations, user_profiles.preferred_locations),
        preferred_employment_types = COALESCE(EXCLUDED.preferred_employment_types, user_profiles.preferred_employment_types),
        salary_expectation = COALESCE(EXCLUDED.salary_expectation, user_profiles.salary_expectation),
        excluded_companies = COALESCE(EXCLUDED.excluded_companies, user_profiles.excluded_companies),
        bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
        years_of_experience = COALESCE(EXCLUDED.years_of_experience, user_profiles.years_of_experience),
        education = COALESCE(EXCLUDED.education, user_profiles.education),
        certifications = COALESCE(EXCLUDED.certifications, user_profiles.certifications),
        preferences = COALESCE(EXCLUDED.preferences, user_profiles.preferences),
        updated_at = NOW()
      RETURNING *
    `);

    return result.rows[0];
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    const result = await this.db.execute<UserProfile>(sql`
      SELECT * FROM user_profiles WHERE user_id = ${userId} LIMIT 1
    `);

    return result.rows[0] || null;
  }

  /**
   * Save refresh token
   */
  async saveRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (${userId}, ${token}, ${expiresAt.toISOString()})
    `);
  }

  /**
   * Find refresh token
   */
  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    const result = await this.db.execute<RefreshToken>(sql`
      SELECT * FROM refresh_tokens 
      WHERE token = ${token} AND expires_at > NOW()
      LIMIT 1
    `);

    return result.rows[0] || null;
  }

  /**
   * Delete refresh token
   */
  async deleteRefreshToken(token: string): Promise<void> {
    await this.db.execute(sql`
      DELETE FROM refresh_tokens WHERE token = ${token}
    `);
  }

  /**
   * Delete all refresh tokens for user
   */
  async deleteAllRefreshTokens(userId: string): Promise<void> {
    await this.db.execute(sql`
      DELETE FROM refresh_tokens WHERE user_id = ${userId}
    `);
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    await this.db.execute(sql`
      DELETE FROM refresh_tokens WHERE expires_at < NOW()
    `);
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique referral code
   */
  private async generateUniqueReferralCode(): Promise<string> {
    const result = await this.db.execute<{ code: string }>(
      sql`SELECT * FROM public.referral_codes where "is_used" = false limit 1; `
    );
    if (result.rows.length === 0) {
      throw new Error("No available referral codes");
    }
    const code = result.rows[0].code;
    return code;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
