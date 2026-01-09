-- =====================================================================================
-- COMPREHENSIVE UUID MIGRATION: Convert users.id and all foreign keys to UUID
-- =====================================================================================
-- This migration safely converts the primary user identifier from varchar to uuid
-- across the entire schema, maintaining referential integrity throughout the process.
--
-- Migration Strategy:
-- 1. Drop all dependent views and constraints
-- 2. Drop all indexes for cleanup
-- 3. Convert users.id (PRIMARY KEY) to uuid
-- 4. Convert all foreign key columns to uuid
-- 5. Recreate all constraints with proper relationships
-- 6. Recreate all indexes with correct operator classes
-- 7. Recreate dependent views
-- =====================================================================================

-- ============================================
-- PHASE 1: Drop All Dependent Objects
-- ============================================

-- Drop views that depend on users table
DROP VIEW IF EXISTS "referral_stats" CASCADE;

-- Drop all foreign key constraints
ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "user_profiles_user_id_users_id_fk";
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_user_id_users_id_fk";
ALTER TABLE "referral_codes" DROP CONSTRAINT IF EXISTS "fk_user";
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "fk_referrer";
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "fk_referee";
ALTER TABLE "rewards" DROP CONSTRAINT IF EXISTS "fk_reward_user";

-- Drop all indexes (will be recreated with correct operator classes)
DROP INDEX IF EXISTS "job_applications_user_id_idx";
DROP INDEX IF EXISTS "job_recommendations_user_id_idx";
DROP INDEX IF EXISTS "job_interactions_user_id_idx";
DROP INDEX IF EXISTS "search_queries_user_id_idx";
DROP INDEX IF EXISTS "recommendation_feedback_user_idx";
DROP INDEX IF EXISTS "user_profiles_user_id_idx";
DROP INDEX IF EXISTS "refresh_tokens_user_id_idx";
DROP INDEX IF EXISTS "idx_referral_codes_user_id";
DROP INDEX IF EXISTS "idx_referrals_referee";
DROP INDEX IF EXISTS "idx_referrals_referrer";
DROP INDEX IF EXISTS "idx_rewards_user";
DROP INDEX IF EXISTS "chat_history_user_id_idx";
DROP INDEX IF EXISTS "processing_queue_user_id_idx";
DROP INDEX IF EXISTS "user_sessions_user_id_idx";
DROP INDEX IF EXISTS "generated_content_user_id_idx";

-- ============================================
-- PHASE 2: Convert Primary Key (users.id)
-- ============================================

-- CRITICAL: Convert the users.id column to uuid FIRST
-- This is the root of the referential integrity chain
ALTER TABLE "users" 
  ALTER COLUMN "id" TYPE uuid USING id::uuid;

-- ============================================
-- PHASE 3: Convert All Foreign Key Columns
-- ============================================

-- Convert foreign keys in authentication/profile tables
ALTER TABLE "user_profiles" 
  ALTER COLUMN "user_id" TYPE uuid USING user_id::uuid;

ALTER TABLE "refresh_tokens" 
  ALTER COLUMN "user_id" TYPE uuid USING user_id::uuid;

-- Convert foreign keys in referral system tables
ALTER TABLE "referral_codes" 
  ALTER COLUMN "user_id" TYPE uuid USING user_id::uuid;

ALTER TABLE "referrals" 
  ALTER COLUMN "referrer_id" TYPE uuid USING referrer_id::uuid,
  ALTER COLUMN "referee_id" TYPE uuid USING referee_id::uuid;

ALTER TABLE "rewards" 
  ALTER COLUMN "user_id" TYPE uuid USING user_id::uuid;

-- Convert foreign keys in AI/chat feature tables
ALTER TABLE "chat_history" 
  ALTER COLUMN "user_id" TYPE uuid USING user_id::uuid;

ALTER TABLE "processing_queue" 
  ALTER COLUMN "user_id" TYPE uuid USING user_id::uuid;

ALTER TABLE "user_sessions" 
  ALTER COLUMN "user_id" TYPE uuid USING user_id::uuid;

ALTER TABLE "generated_content" 
  ALTER COLUMN "user_id" TYPE uuid USING user_id::uuid;

-- Note: job_applications, job_recommendations, job_interactions, 
-- search_queries, and recommendation_feedback already use uuid type

-- ============================================
-- PHASE 4: Recreate Foreign Key Constraints
-- ============================================

-- Authentication and profile constraints
ALTER TABLE "user_profiles" 
  ADD CONSTRAINT "user_profiles_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") 
  REFERENCES "users"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" 
  ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") 
  REFERENCES "users"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- Referral system constraints
ALTER TABLE "referral_codes" 
  ADD CONSTRAINT "fk_user" 
  FOREIGN KEY ("user_id") 
  REFERENCES "users"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

ALTER TABLE "referrals" 
  ADD CONSTRAINT "fk_referrer" 
  FOREIGN KEY ("referrer_id") 
  REFERENCES "users"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

ALTER TABLE "referrals" 
  ADD CONSTRAINT "fk_referee" 
  FOREIGN KEY ("referee_id") 
  REFERENCES "users"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

ALTER TABLE "rewards" 
  ADD CONSTRAINT "fk_reward_user" 
  FOREIGN KEY ("user_id") 
  REFERENCES "users"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- ============================================
-- PHASE 5: Recreate Indexes with UUID Ops
-- ============================================

-- Job-related indexes
CREATE INDEX "job_applications_user_id_idx" 
  ON "job_applications" USING btree ("user_id");

CREATE INDEX "job_recommendations_user_id_idx" 
  ON "job_recommendations" USING btree ("user_id");

CREATE INDEX "job_interactions_user_id_idx" 
  ON "job_interactions" USING btree ("user_id");

CREATE INDEX "search_queries_user_id_idx" 
  ON "search_queries" USING btree ("user_id");

CREATE INDEX "recommendation_feedback_user_idx" 
  ON "recommendation_feedback" USING btree ("user_id");

-- Authentication and profile indexes
CREATE INDEX "user_profiles_user_id_idx" 
  ON "user_profiles" USING btree ("user_id");

CREATE INDEX "refresh_tokens_user_id_idx" 
  ON "refresh_tokens" USING btree ("user_id");

-- Referral system indexes
CREATE INDEX "idx_referral_codes_user_id" 
  ON "referral_codes" USING btree ("user_id");

CREATE INDEX "idx_referrals_referee" 
  ON "referrals" USING btree ("referee_id");

CREATE INDEX "idx_referrals_referrer" 
  ON "referrals" USING btree ("referrer_id");

CREATE INDEX "idx_rewards_user" 
  ON "rewards" USING btree ("user_id");

-- AI/Chat feature indexes
CREATE INDEX "chat_history_user_id_idx" 
  ON "chat_history" USING btree ("user_id");

CREATE INDEX "processing_queue_user_id_idx" 
  ON "processing_queue" USING btree ("user_id");

CREATE INDEX "user_sessions_user_id_idx" 
  ON "user_sessions" USING btree ("user_id");

CREATE INDEX "generated_content_user_id_idx" 
  ON "generated_content" USING btree ("user_id");

-- ============================================
-- PHASE 6: Recreate Dependent Views
-- ============================================

CREATE VIEW "referral_stats" AS
SELECT 
  u.id AS user_id,
  u.referral_code,
  COUNT(DISTINCT r.id) AS total_referrals,
  COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id ELSE NULL END) AS completed_referrals,
  COUNT(DISTINCT CASE WHEN r.status = 'pending' THEN r.id ELSE NULL END) AS pending_referrals,
  COALESCE(SUM(rw.amount), 0) AS total_rewards,
  MAX(r.created_at) AS last_referral_date
FROM "users" u
LEFT JOIN "referrals" r ON u.id = r.referrer_id
LEFT JOIN "rewards" rw ON u.id = rw.user_id AND rw.status = 'completed'
GROUP BY u.id, u.referral_code;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- All user_id references have been successfully converted to uuid type.
-- Referential integrity has been maintained throughout the migration.
-- All indexes have been recreated with appropriate operator classes.
-- =====================================================================================