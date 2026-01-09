// src/module/auth/services/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthRepository } from "../repositories/auth.repository";
import type {
  SignUpRequest,
  SignInRequest,
  User,
  UserPublic,
  UserProfile,
  JWTPayload,
  UpdateUserRequest,
  UpdatePasswordRequest,
  UpdateProfileRequest,
} from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "15m"; // Access token expires in 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Authentication Service
 * Handles business logic for authentication and user management
 */
export class AuthService {
  constructor(private repository: AuthRepository) {}

  /**
   * Register a new user
   */
  async signUp(request: SignUpRequest): Promise<{
    user: UserPublic;
    accessToken: string;
    refreshToken: string;
  }> {
    // Validate email format
    if (!this.isValidEmail(request.email)) {
      throw new Error("Invalid email format");
    }

    // Validate password strength
    if (!this.isValidPassword(request.password)) {
      throw new Error(
        "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
      );
    }

    // Check if user already exists
    const existingUser = await this.repository.findUserByEmail(request.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Validate referral code if provided
    if (request.referredBy) {
      const referrer = await this.repository.findUserByReferralCode(
        request.referredBy
      );
      if (!referrer) {
        throw new Error("Invalid referral code");
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(request.password, 10);

    // Create user
    const user = await this.repository.createUser(
      request.email.toLowerCase(),
      passwordHash,
      request.firstName,
      request.lastName,
      request.referredBy
    );

    // Create empty profile
    await this.repository.upsertProfile(user.id, {});

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken();

    // Save refresh token
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);
    await this.repository.saveRefreshToken(user.id, refreshToken, expiresAt);

    // Update last login
    await this.repository.updateLastLogin(user.id);

    return {
      user: this.toPublicUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Sign in existing user
   */
  async signIn(request: SignInRequest): Promise<{
    user: UserPublic;
    accessToken: string;
    refreshToken: string;
  }> {
    // Find user
    const user = await this.repository.findUserByEmail(
      request.email.toLowerCase()
    );
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check if account is active
    if (user.isActive !== "true") {
      throw new Error("Account is deactivated");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      request.password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken();

    // Save refresh token
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);
    await this.repository.saveRefreshToken(user.id, refreshToken, expiresAt);

    // Update last login
    await this.repository.updateLastLogin(user.id);

    // Get profile
    const profile = await this.repository.getProfile(user.id);

    return {
      user: this.toPublicUser(user, profile),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Validate refresh token
    const tokenRecord = await this.repository.findRefreshToken(refreshToken);
    if (!tokenRecord) {
      throw new Error("Invalid refresh token");
    }

    // Get user
    const user = await this.repository.findUserById(tokenRecord.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Delete old refresh token
    await this.repository.deleteRefreshToken(refreshToken);

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken();

    // Save new refresh token
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);
    await this.repository.saveRefreshToken(
      user.id,
      newRefreshToken,
      expiresAt
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Sign out user
   */
  async signOut(refreshToken: string): Promise<void> {
    await this.repository.deleteRefreshToken(refreshToken);
  }

  /**
   * Sign out from all devices
   */
  async signOutAll(userId: string): Promise<void> {
    await this.repository.deleteAllRefreshTokens(userId);
  }

  /**
   * Get current user with profile
   */
  async getCurrentUser(userId: string): Promise<UserPublic> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const profile = await this.repository.getProfile(userId);
    return this.toPublicUser(user, profile);
  }

  /**
   * Update user information
   */
  async updateUser(
    userId: string,
    updates: UpdateUserRequest
  ): Promise<UserPublic> {
    // Validate email if provided
    if (updates.email && !this.isValidEmail(updates.email)) {
      throw new Error("Invalid email format");
    }

    // Check if new email already exists
    if (updates.email) {
      const existingUser = await this.repository.findUserByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error("Email already in use");
      }
    }

    const user = await this.repository.updateUser(userId, updates);
    if (!user) {
      throw new Error("User not found");
    }

    const profile = await this.repository.getProfile(userId);
    return this.toPublicUser(user, profile);
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string,
    request: UpdatePasswordRequest
  ): Promise<void> {
    // Get user
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      request.currentPassword,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    if (!this.isValidPassword(request.newPassword)) {
      throw new Error(
        "New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
      );
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(request.newPassword, 10);

    // Update password
    await this.repository.updatePassword(userId, newPasswordHash);

    // Sign out from all devices for security
    await this.repository.deleteAllRefreshTokens(userId);
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: UpdateProfileRequest
  ): Promise<UserProfile> {
    const profile = await this.repository.upsertProfile(userId, updates);
    return profile;
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    // Get user
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    // Delete user (cascade will delete profile and tokens)
    await this.repository.deleteUser(userId);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Generate access token
   */
  private generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 32)}`;
  }

  /**
   * Convert User to UserPublic
   */
  private toPublicUser(user: User, profile?: UserProfile | null): UserPublic {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      referralCode: user.referralCode,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      profile: profile
        ? {
            currentJobTitle: profile.currentJobTitle,
            desiredJobTitle: profile.desiredJobTitle,
            skills: profile.skills,
            experienceLevel: profile.experienceLevel,
            preferredLocations: profile.preferredLocations,
            preferredEmploymentTypes: profile.preferredEmploymentTypes,
            salaryExpectation: profile.salaryExpectation,
            bio: profile.bio,
            yearsOfExperience: profile.yearsOfExperience,
            education: profile.education,
            certifications: profile.certifications,
          }
        : undefined,
    };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  private isValidPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(password);
  }
}