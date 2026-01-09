// src/module/auth/types/auth.types.ts
/**
 * Authentication and User Management Types
 */

export interface SignUpRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  referredBy?: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: UserPublic;
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

export interface User extends Record<string, any> {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  referralCode: string;
  referredBy?: string;
  emailVerified?: string;
  resetToken?: string;
  resetTokenExpiry?: string;
  lastLogin?: string;
  isActive: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserPublic {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  referralCode: string;
  emailVerified?: string;
  lastLogin?: string;
  createdAt?: string;
  profile?: UserProfilePublic;
}

export interface UserProfile extends Record<string, any> {
  id: string;
  userId: string;
  currentJobTitle?: string;
  desiredJobTitle?: string;
  skills?: string[];
  experienceLevel?: string;
  preferredLocations?: string[];
  preferredEmploymentTypes?: string[];
  salaryExpectation?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  excludedCompanies?: string[];
  bio?: string;
  yearsOfExperience?: string;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  certifications?: string[];
  preferences?: Record<string, any>;
  lastActive?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfilePublic {
  currentJobTitle?: string;
  desiredJobTitle?: string;
  skills?: string[];
  experienceLevel?: string;
  preferredLocations?: string[];
  preferredEmploymentTypes?: string[];
  salaryExpectation?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  bio?: string;
  yearsOfExperience?: string;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  certifications?: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  currentJobTitle?: string;
  desiredJobTitle?: string;
  skills?: string[];
  experienceLevel?: string;
  preferredLocations?: string[];
  preferredEmploymentTypes?: string[];
  salaryExpectation?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  excludedCompanies?: string[];
  bio?: string;
  yearsOfExperience?: string;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  certifications?: string[];
  preferences?: Record<string, any>;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirmRequest {
  token: string;
  newPassword: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshToken extends Record<string, any> {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt?: string;
}