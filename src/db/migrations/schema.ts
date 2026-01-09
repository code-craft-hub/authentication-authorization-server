import {
  pgTable,
  index,
  text,
  jsonb,
  date,
  timestamp,
  uuid,
  foreignKey,
  unique,
  varchar,
  boolean,
  serial,
  integer,
  numeric,
  pgView,
  bigint,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const jobPosts = pgTable(
  "job_posts",
  {
    link: text(),
    title: text(),
    companyName: text("company_name"),
    companyLogo: text("company_logo"),
    location: text(),
    salaryInfo: jsonb("salary_info"),
    postedAt: date("posted_at"),
    descriptionHtml: text("description_html"),
    applyUrl: text("apply_url"),
    descriptionText: text("description_text"),
    jobFunction: text("job_function"),
    employmentType: text("employment_type"),
    expireAt: date("expire_at"),
    emailApply: text("email_apply"),
    source: text(),
    payload: jsonb(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    fts: tsvector("fts").generatedAlwaysAs(
      sql`(((setweight(to_tsvector('english'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(job_function, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(company_name, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(description_text, ''::text)), 'C'::"char"))`
    ),
    ftsTitle: tsvector("fts_title").generatedAlwaysAs(
      sql`to_tsvector('english'::regconfig, COALESCE(title, ''::text))`
    ),
    ftsDescriptionText: tsvector("fts_description_text").generatedAlwaysAs(
      sql`to_tsvector('english'::regconfig, COALESCE(description_text, ''::text))`
    ),
  },
  (table) => [
    index("idx_fts_description_text").using(
      "gin",
      table.ftsDescriptionText.asc().nullsLast().op("tsvector_ops")
    ),
    index("idx_fts_title").using(
      "gin",
      table.ftsTitle.asc().nullsLast().op("tsvector_ops")
    ),
    index("job_posts_link_idx").using(
      "btree",
      table.link.asc().nullsLast().op("text_ops")
    ),
    index("job_posts_location_idx").using(
      "gin",
      table.location.asc().nullsLast().op("gin_trgm_ops")
    ),
    index("job_posts_posted_at_idx").using(
      "btree",
      table.postedAt.asc().nullsLast().op("date_ops")
    ),
  ]
);

export const jobApplications = pgTable(
  "job_applications",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    jobId: uuid("job_id"),
    resumeId: uuid("resume_id"),
    coverLetterId: uuid("cover_letter_id"),
    status: text().notNull(),
    recruiterEmail: text("recruiter_email"),
    errorMessage: text("error_message"),
    appliedAt: timestamp("applied_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    index("job_applications_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops")
    ),
    // FIXED: uuid_ops instead of text_ops
    index("job_applications_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "job_applications_job_id_job_posts_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.resumeId],
      foreignColumns: [generatedContent.id],
      name: "job_applications_resume_id_generated_content_id_fk",
    }),
    foreignKey({
      columns: [table.coverLetterId],
      foreignColumns: [generatedContent.id],
      name: "job_applications_cover_letter_id_generated_content_id_fk",
    }),
  ]
);

export const jobRecommendations = pgTable(
  "job_recommendations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    jobId: uuid("job_id").notNull(),
    recommendationDate: date("recommendation_date").defaultNow(),
    status: text().default("sent"),
    matchScore: text("match_score"),
    geminiReasoning: text("gemini_reasoning"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    index("job_recommendations_date_idx").using(
      "btree",
      table.recommendationDate.asc().nullsLast().op("date_ops")
    ),
    index("job_recommendations_job_id_idx").using(
      "btree",
      table.jobId.asc().nullsLast().op("uuid_ops")
    ),
    // FIXED: uuid_ops instead of text_ops
    index("job_recommendations_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "job_recommendations_job_id_job_posts_id_fk",
    }).onDelete("cascade"),
  ]
);

export const jobInteractions = pgTable(
  "job_interactions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    jobId: uuid("job_id").notNull(),
    interactionType: text("interaction_type").notNull(),
    sessionId: text("session_id"),
    metadata: jsonb("metadata").$type<{
      timeSpent?: number;
      scrollDepth?: number;
      source?: string;
    }>(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    // FIXED: uuid_ops instead of text_ops
    index("job_interactions_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    index("job_interactions_job_id_idx").using(
      "btree",
      table.jobId.asc().nullsLast().op("uuid_ops")
    ),
    index("job_interactions_type_idx").using(
      "btree",
      table.interactionType.asc().nullsLast().op("text_ops")
    ),
    index("job_interactions_created_at_idx").using(
      "btree",
      table.createdAt.asc().nullsLast()
    ),
    index("job_interactions_session_idx").using(
      "btree",
      table.sessionId.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "job_interactions_job_id_job_posts_id_fk",
    }).onDelete("cascade"),
    index("job_interactions_user_job_idx").on(table.userId, table.jobId),
  ]
);

export const searchQueries = pgTable(
  "search_queries",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id"),
    sessionId: text("session_id"),
    jobTitle: text("job_title").notNull(),
    skills: jsonb("skills").$type<string[]>().notNull(),
    filters: jsonb("filters").$type<Record<string, any>>(),
    resultsCount: integer("results_count").default(0),
    resultsShown: integer("results_shown").default(0),
    interactionCount: integer("interaction_count").default(0),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    // FIXED: uuid_ops instead of text_ops
    index("search_queries_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    index("search_queries_created_at_idx").using(
      "btree",
      table.createdAt.asc().nullsLast()
    ),
    index("search_queries_session_idx").using(
      "btree",
      table.sessionId.asc().nullsLast().op("text_ops")
    ),
  ]
);

export const recommendationFeedback = pgTable(
  "recommendation_feedback",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    jobId: uuid("job_id").notNull(),
    feedbackType: text("feedback_type").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    // FIXED: uuid_ops instead of text_ops
    index("recommendation_feedback_user_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    index("recommendation_feedback_job_idx").using(
      "btree",
      table.jobId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "recommendation_feedback_job_id_job_posts_id_fk",
    }).onDelete("cascade"),
    unique("recommendation_feedback_unique").on(
      table.userId,
      table.jobId,
      table.feedbackType
    ),
  ]
);

export const users = pgTable(
  "users",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    email: varchar({ length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    referralCode: varchar("referral_code", { length: 20 }).notNull(),
    referredBy: varchar("referred_by", { length: 20 }),
    emailVerified: timestamp("email_verified", {
      withTimezone: true,
      mode: "string",
    }),
    resetToken: varchar("reset_token", { length: 255 }),
    resetTokenExpiry: timestamp("reset_token_expiry", {
      withTimezone: true,
      mode: "string",
    }),
    lastLogin: timestamp("last_login", {
      withTimezone: true,
      mode: "string",
    }),
    isActive: varchar("is_active", { length: 10 }).default("true").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_users_email").using(
      "btree",
      table.email.asc().nullsLast().op("text_ops")
    ),
    index("idx_users_referral_code").using(
      "btree",
      table.referralCode.asc().nullsLast().op("text_ops")
    ),
    index("idx_users_referred_by").using(
      "btree",
      table.referredBy.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.referredBy],
      foreignColumns: [table.referralCode],
      name: "fk_referred_by",
    }).onDelete("set null"),
    unique("users_email_key").on(table.email),
    unique("users_referral_code_key").on(table.referralCode),
  ]
);

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    // FIXED: Changed from varchar to uuid
    userId: uuid("user_id").notNull().unique(),
    currentJobTitle: text("current_job_title"),
    desiredJobTitle: text("desired_job_title"),
    skills: jsonb("skills").$type<string[]>(),
    experienceLevel: text("experience_level"),
    preferredLocations: jsonb("preferred_locations").$type<string[]>(),
    preferredEmploymentTypes: jsonb("preferred_employment_types").$type<
      string[]
    >(),
    salaryExpectation: jsonb("salary_expectation").$type<{
      min?: number;
      max?: number;
      currency?: string;
    }>(),
    excludedCompanies: jsonb("excluded_companies").$type<string[]>(),
    bio: text("bio"),
    yearsOfExperience: text("years_of_experience"),
    education: jsonb("education").$type<
      Array<{
        degree: string;
        institution: string;
        year: string;
      }>
    >(),
    certifications: jsonb("certifications").$type<string[]>(),
    preferences: jsonb("preferences").$type<Record<string, any>>(),
    lastActive: timestamp("last_active", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    // FIXED: uuid_ops instead of text_ops
    index("user_profiles_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    index("user_profiles_last_active_idx").using(
      "btree",
      table.lastActive.asc().nullsLast()
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_profiles_user_id_users_id_fk",
    }).onDelete("cascade"),
  ]
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    // FIXED: Changed from varchar to uuid
    userId: uuid("user_id").notNull(),
    token: varchar({ length: 500 }).notNull().unique(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    // FIXED: uuid_ops instead of text_ops
    index("refresh_tokens_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    index("refresh_tokens_token_idx").using(
      "btree",
      table.token.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "refresh_tokens_user_id_users_id_fk",
    }).onDelete("cascade"),
  ]
);

export const referralCodes = pgTable(
  "referral_codes",
  {
    code: varchar({ length: 20 }).primaryKey().notNull(),
    // FIXED: Changed from varchar to uuid
    userId: uuid("user_id"),
    isUsed: boolean("is_used").default(false),
    usedAt: timestamp("used_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).default(sql`CURRENT_TIMESTAMP`),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("idx_referral_codes_is_used").using(
      "btree",
      table.isUsed.asc().nullsLast().op("bool_ops")
    ),
    // FIXED: uuid_ops instead of text_ops
    index("idx_referral_codes_user_id").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fk_user",
    }).onDelete("set null"),
  ]
);

export const referrals = pgTable(
  "referrals",
  {
    id: serial().primaryKey().notNull(),
    // FIXED: Changed from varchar to uuid
    referrerId: uuid("referrer_id").notNull(),
    refereeId: uuid("referee_id").notNull(),
    referralCode: varchar("referral_code", { length: 20 }).notNull(),
    status: varchar({ length: 20 }).default("pending"),
    rewardStatus: varchar("reward_status", { length: 20 }).default("pending"),
    metadata: jsonb(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).default(sql`CURRENT_TIMESTAMP`),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("idx_referrals_code").using(
      "btree",
      table.referralCode.asc().nullsLast().op("text_ops")
    ),
    // FIXED: uuid_ops instead of text_ops
    index("idx_referrals_referee").using(
      "btree",
      table.refereeId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_referrals_referrer").using(
      "btree",
      table.referrerId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_referrals_status").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.referrerId],
      foreignColumns: [users.id],
      name: "fk_referrer",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.refereeId],
      foreignColumns: [users.id],
      name: "fk_referee",
    }).onDelete("cascade"),
  ]
);

export const rewards = pgTable(
  "rewards",
  {
    id: serial().primaryKey().notNull(),
    // FIXED: Changed from varchar to uuid
    userId: uuid("user_id").notNull(),
    referralId: integer("referral_id").notNull(),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    currency: varchar({ length: 3 }).default("USD"),
    type: varchar({ length: 20 }).notNull(),
    status: varchar({ length: 20 }).default("pending"),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_rewards_referral").using(
      "btree",
      table.referralId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_rewards_status").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops")
    ),
    // FIXED: uuid_ops instead of text_ops
    index("idx_rewards_user").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fk_reward_user",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.referralId],
      foreignColumns: [referrals.id],
      name: "fk_reward_referral",
    }).onDelete("cascade"),
  ]
);

export const chatHistory = pgTable(
  "chat_history",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    phoneNumber: text("phone_number").notNull(),
    role: text().notNull(),
    message: text().notNull(),
    messageType: text("message_type"),
    metadata: jsonb(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    index("chat_history_created_at_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops")
    ),
    // FIXED: uuid_ops instead of text_ops
    index("chat_history_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
  ]
);

export const processingQueue = pgTable(
  "processing_queue",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    phoneNumber: text("phone_number").notNull(),
    operationType: text("operation_type").notNull(),
    jobId: uuid("job_id"),
    status: text().default("queued"),
    progress: text(),
    result: jsonb(),
    errorMessage: text("error_message"),
    queuedAt: timestamp("queued_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "string",
    }),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("processing_queue_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops")
    ),
    // FIXED: uuid_ops instead of text_ops
    index("processing_queue_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
  ]
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    phoneNumber: text("phone_number").notNull(),
    whatsappId: text("whatsapp_id"),
    sessionState: text("session_state").default("idle"),
    lastInteraction: timestamp("last_interaction", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    context: jsonb(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    extractedJobData: jsonb("extracted_job_data"),
  },
  (table) => [
    index("user_sessions_phone_number_idx").using(
      "btree",
      table.phoneNumber.asc().nullsLast().op("text_ops")
    ),
    // FIXED: uuid_ops instead of text_ops
    index("user_sessions_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
  ]
);

export const generatedContent = pgTable(
  "generated_content",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    jobId: uuid("job_id"),
    contentType: text("content_type").notNull(),
    content: jsonb().notNull(),
    metadata: jsonb(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    mediaId: text("media_id"),
    messageId: text("message_id"),
  },
  (table) => [
    index("generated_content_type_idx").using(
      "btree",
      table.contentType.asc().nullsLast().op("text_ops")
    ),
    // FIXED: uuid_ops instead of text_ops
    index("generated_content_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "generated_content_job_id_job_posts_id_fk",
    }).onDelete("cascade"),
  ]
);

// FIXED: Changed varchar to uuid in view definition
export const referralStats = pgView("referral_stats", {
  userId: uuid("user_id"),
  referralCode: varchar("referral_code", { length: 20 }),
  totalReferrals: bigint("total_referrals", { mode: "number" }),
  completedReferrals: bigint("completed_referrals", { mode: "number" }),
  pendingReferrals: bigint("pending_referrals", { mode: "number" }),
  totalRewards: numeric("total_rewards"),
  lastReferralDate: timestamp("last_referral_date", {
    withTimezone: true,
    mode: "string",
  }),
}).as(
  sql`SELECT u.id AS user_id, u.referral_code, count(DISTINCT r.id) AS total_referrals, count(DISTINCT CASE WHEN r.status::text = 'completed'::text THEN r.id ELSE NULL::integer END) AS completed_referrals, count(DISTINCT CASE WHEN r.status::text = 'pending'::text THEN r.id ELSE NULL::integer END) AS pending_referrals, COALESCE(sum(rw.amount), 0::numeric) AS total_rewards, max(r.created_at) AS last_referral_date FROM users u LEFT JOIN referrals r ON u.id = r.referrer_id LEFT JOIN rewards rw ON u.id = rw.user_id AND rw.status::text = 'completed'::text GROUP BY u.id, u.referral_code`
);