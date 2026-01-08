import type {
  AccountStatus,
  AuthProvider,
  PaginationParams,
  UserRole,
} from "./common.types";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  role: UserRole;
  status: AccountStatus;
  isEmailVerified: boolean;
  authProvider: AuthProvider;
  credits: number;
  referralCode: string;
  referredById?: string;
  referralCount: number;
  totalReferralEarnings: number;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  referralCode?: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
  verificationToken?: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  nextMilestone: number | null;
  referralsToNextMilestone: number;
}

export interface ReferredUser {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
  creditsEarned: number;
  milestoneBonus: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description?: string;
  referenceId?: string;
  balanceBefore: number;
  balanceAfter: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface CreditHistory {
  transactions: CreditTransaction[];
  stats: {
    totalEarned: number;
    totalSpent: number;
    transactionCount: number;
  };
}

export interface LeaderboardEntry {
  userId: string;
  email: string;
  displayName?: string;
  credits: number;
  totalReferralEarnings: number;
  referralCount: number;
}

export interface AdminUserFilters extends PaginationParams {
  search?: string;
  role?: UserRole;
  status?: AccountStatus;
}

export interface AdminUpdateUserRequest {
  role?: UserRole;
  status?: AccountStatus;
  credits?: number;
  isEmailVerified?: boolean;
}

export interface AdminUserActionRequest {
  reason?: string;
}

export interface AdminDashboardStats {
  userStats: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    bannedUsers: number;
    verifiedUsers: number;
  };
  recentActivity: AuditLog[];
}

export interface AuditLog {
  id: string;
  userId?: string;
  adminId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    device?: string;
  };
  isActive: boolean;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
}
