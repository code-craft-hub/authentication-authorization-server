import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN', 'SUPER_ADMIN']);
export const authProviderEnum = pgEnum('auth_provider', ['EMAIL', 'GOOGLE']);
export const accountStatusEnum = pgEnum('account_status', ['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION']);
export const auditActionEnum = pgEnum('audit_action', ['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'EMAIL_CHANGE', 'PROFILE_UPDATE', 'ACCOUNT_SUSPENDED', 'ACCOUNT_BANNED', 'CREDITS_ADDED', 'CREDITS_DEDUCTED', 'REFERRAL_EARNED']);

// Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  googleId: varchar('google_id', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  displayName: varchar('display_name', { length: 200 }),
  avatar: text('avatar'),
  role: userRoleEnum('role').default('USER').notNull(),
  status: accountStatusEnum('status').default('ACTIVE').notNull(),
  isEmailVerified: boolean('is_email_verified').default(false).notNull(),
  authProvider: authProviderEnum('auth_provider').default('EMAIL').notNull(),
  credits: integer('credits').default(0).notNull(),
  referralCode: varchar('referral_code', { length: 12 }).notNull().unique(),
  referredById: uuid('referred_by_id'),
  referralCount: integer('referral_count').default(0).notNull(),
  totalReferralEarnings: integer('total_referral_earnings').default(0).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  passwordChangedAt: timestamp('password_changed_at'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  googleIdIdx: index('users_google_id_idx').on(table.googleId),
  referralCodeIdx: uniqueIndex('users_referral_code_idx').on(table.referralCode),
  referredByIdx: index('users_referred_by_idx').on(table.referredById),
}));

// Refresh Tokens Table (for JWT rotation)
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  deviceInfo: jsonb('device_info').$type<{ userAgent?: string; ip?: string }>(),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('refresh_tokens_token_idx').on(table.token),
  userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
}));

// Session Management Table (for tracking active sessions)
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull().unique(),
  deviceInfo: jsonb('device_info').$type<{ userAgent?: string; ip?: string; device?: string }>(),
  isActive: boolean('is_active').default(true).notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sessionTokenIdx: uniqueIndex('sessions_token_idx').on(table.sessionToken),
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
}));

// Email Verification Tokens
export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('email_verification_tokens_token_idx').on(table.token),
  userIdIdx: index('email_verification_tokens_user_id_idx').on(table.userId),
}));

// Password Reset Tokens
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  isUsed: boolean('is_used').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('password_reset_tokens_token_idx').on(table.token),
  userIdIdx: index('password_reset_tokens_user_id_idx').on(table.userId),
}));

// Referrals Table (tracking individual referrals)
export const referrals = pgTable('referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerId: uuid('referrer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  referredUserId: uuid('referred_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  creditsEarned: integer('credits_earned').default(0).notNull(),
  milestoneBonus: integer('milestone_bonus').default(0).notNull(),
  wasProcessed: boolean('was_processed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  referrerIdx: index('referrals_referrer_id_idx').on(table.referrerId),
  referredIdx: index('referrals_referred_user_id_idx').on(table.referredUserId),
}));

// Credit Transactions Table
export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'REFERRAL', 'MILESTONE_BONUS', 'ADMIN_ADJUSTMENT', 'PURCHASE', 'DEDUCTION'
  description: text('description'),
  referenceId: uuid('reference_id'),
  balanceBefore: integer('balance_before').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('credit_transactions_user_id_idx').on(table.userId),
  typeIdx: index('credit_transactions_type_idx').on(table.type),
}));

// Audit Logs Table (comprehensive activity tracking)
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  adminId: uuid('admin_id').references(() => users.id, { onDelete: 'set null' }),
  action: auditActionEnum('action').notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  details: jsonb('details').$type<Record<string, any>>(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  adminIdIdx: index('audit_logs_admin_id_idx').on(table.adminId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  referredBy: one(users, {
    fields: [users.referredById],
    references: [users.id],
  }),
  referrals: many(referrals, { relationName: 'referrer' }),
  referredUsers: many(referrals, { relationName: 'referred' }),
  refreshTokens: many(refreshTokens),
  sessions: many(sessions),
  creditTransactions: many(creditTransactions),
  auditLogs: many(auditLogs),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: 'referrer',
  }),
  referredUser: one(users, {
    fields: [referrals.referredUserId],
    references: [users.id],
    relationName: 'referred',
  }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  admin: one(users, {
    fields: [auditLogs.adminId],
    references: [users.id],
  }),
}));