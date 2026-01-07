import { Request } from 'express';
import { users } from '@/models/schema';

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type AuthProvider = 'EMAIL' | 'GOOGLE';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_VERIFICATION';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  iat: number;
  exp: number;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  nextMilestone: number | null;
  referralsToNextMilestone: number;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
}

export interface AuditLogEntry {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Repository interfaces
export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(params?: PaginationParams): Promise<PaginatedResponse<T>>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// Service response types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;