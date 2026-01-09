-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "job_posts" (
	"link" text,
	"title" text,
	"company_name" text,
	"company_logo" text,
	"location" text,
	"salary_info" jsonb,
	"posted_at" date,
	"description_html" text,
	"apply_url" text,
	"description_text" text,
	"job_function" text,
	"employment_type" text,
	"expire_at" date,
	"email_apply" text,
	"source" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fts" "tsvector" GENERATED ALWAYS AS ((((setweight(to_tsvector('english'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(job_function, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(company_name, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(description_text, ''::text)), 'C'::"char"))) STORED,
	"fts_title" "tsvector" GENERATED ALWAYS AS (to_tsvector('english'::regconfig, COALESCE(title, ''::text))) STORED,
	"fts_description_text" "tsvector" GENERATED ALWAYS AS (to_tsvector('english'::regconfig, COALESCE(description_text, ''::text))) STORED
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"job_id" uuid,
	"resume_id" uuid,
	"cover_letter_id" uuid,
	"status" text NOT NULL,
	"recruiter_email" text,
	"error_message" text,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"recommendation_date" date DEFAULT now(),
	"status" text DEFAULT 'sent',
	"match_score" text,
	"gemini_reasoning" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"referral_code" varchar(20) NOT NULL,
	"referred_by" varchar(20),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_referral_code_key" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"code" varchar(20) PRIMARY KEY NOT NULL,
	"user_id" varchar(128),
	"is_used" boolean DEFAULT false,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" varchar(128) NOT NULL,
	"referee_id" varchar(128) NOT NULL,
	"referral_code" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"reward_status" varchar(20) DEFAULT 'pending',
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"referral_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "chat_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"role" text NOT NULL,
	"message" text NOT NULL,
	"message_type" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "processing_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"operation_type" text NOT NULL,
	"job_id" uuid,
	"status" text DEFAULT 'queued',
	"progress" text,
	"result" jsonb,
	"error_message" text,
	"queued_at" timestamp with time zone DEFAULT now(),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"whatsapp_id" text,
	"session_state" text DEFAULT 'idle',
	"last_interaction" timestamp with time zone DEFAULT now(),
	"context" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"extracted_job_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "generated_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"job_id" uuid,
	"content_type" text NOT NULL,
	"content" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"media_id" text,
	"message_id" text
);
--> statement-breakpoint
CREATE TABLE "search_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"session_id" text,
	"job_title" text NOT NULL,
	"skills" jsonb NOT NULL,
	"filters" jsonb,
	"results_count" integer DEFAULT 0,
	"results_shown" integer DEFAULT 0,
	"interaction_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"current_job_title" text,
	"desired_job_title" text,
	"skills" jsonb,
	"experience_level" text,
	"preferred_locations" jsonb,
	"preferred_employment_types" jsonb,
	"salary_expectation" jsonb,
	"excluded_companies" jsonb,
	"preferences" jsonb,
	"last_active" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "job_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"interaction_type" text NOT NULL,
	"session_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recommendation_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"feedback_type" text NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "recommendation_feedback_unique" UNIQUE("user_id","job_id","feedback_type")
);
--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_job_posts_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_resume_id_generated_content_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."generated_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_cover_letter_id_generated_content_id_fk" FOREIGN KEY ("cover_letter_id") REFERENCES "public"."generated_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_recommendations" ADD CONSTRAINT "job_recommendations_job_id_job_posts_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "fk_referred_by" FOREIGN KEY ("referred_by") REFERENCES "public"."users"("referral_code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "fk_referrer" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "fk_referee" FOREIGN KEY ("referee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "fk_reward_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "fk_reward_referral" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_content" ADD CONSTRAINT "generated_content_job_id_job_posts_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_interactions" ADD CONSTRAINT "job_interactions_job_id_job_posts_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_job_id_job_posts_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fts_description_text" ON "job_posts" USING gin ("fts_description_text" tsvector_ops);--> statement-breakpoint
CREATE INDEX "idx_fts_title" ON "job_posts" USING gin ("fts_title" tsvector_ops);--> statement-breakpoint
CREATE INDEX "job_posts_link_idx" ON "job_posts" USING btree ("link" text_ops);--> statement-breakpoint
CREATE INDEX "job_posts_location_idx" ON "job_posts" USING gin ("location" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "job_posts_posted_at_idx" ON "job_posts" USING btree ("posted_at" date_ops);--> statement-breakpoint
CREATE INDEX "job_applications_status_idx" ON "job_applications" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "job_applications_user_id_idx" ON "job_applications" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "job_recommendations_date_idx" ON "job_recommendations" USING btree ("recommendation_date" date_ops);--> statement-breakpoint
CREATE INDEX "job_recommendations_job_id_idx" ON "job_recommendations" USING btree ("job_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "job_recommendations_user_id_idx" ON "job_recommendations" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_users_referral_code" ON "users" USING btree ("referral_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_users_referred_by" ON "users" USING btree ("referred_by" text_ops);--> statement-breakpoint
CREATE INDEX "idx_referral_codes_is_used" ON "referral_codes" USING btree ("is_used" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_referral_codes_user_id" ON "referral_codes" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_referrals_code" ON "referrals" USING btree ("referral_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_referrals_referee" ON "referrals" USING btree ("referee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_referrals_referrer" ON "referrals" USING btree ("referrer_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_referrals_status" ON "referrals" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_rewards_referral" ON "rewards" USING btree ("referral_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_rewards_status" ON "rewards" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_rewards_user" ON "rewards" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "chat_history_created_at_idx" ON "chat_history" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "chat_history_user_id_idx" ON "chat_history" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "processing_queue_status_idx" ON "processing_queue" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "processing_queue_user_id_idx" ON "processing_queue" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "user_sessions_phone_number_idx" ON "user_sessions" USING btree ("phone_number" text_ops);--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "generated_content_type_idx" ON "generated_content" USING btree ("content_type" text_ops);--> statement-breakpoint
CREATE INDEX "generated_content_user_id_idx" ON "generated_content" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "search_queries_created_at_idx" ON "search_queries" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "search_queries_session_idx" ON "search_queries" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "search_queries_user_id_idx" ON "search_queries" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "user_profiles_last_active_idx" ON "user_profiles" USING btree ("last_active" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "job_interactions_created_at_idx" ON "job_interactions" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "job_interactions_job_id_idx" ON "job_interactions" USING btree ("job_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "job_interactions_session_idx" ON "job_interactions" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "job_interactions_type_idx" ON "job_interactions" USING btree ("interaction_type" text_ops);--> statement-breakpoint
CREATE INDEX "job_interactions_user_id_idx" ON "job_interactions" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "job_interactions_user_job_idx" ON "job_interactions" USING btree ("user_id" text_ops,"job_id" text_ops);--> statement-breakpoint
CREATE INDEX "recommendation_feedback_job_idx" ON "recommendation_feedback" USING btree ("job_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "recommendation_feedback_user_idx" ON "recommendation_feedback" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE VIEW "public"."referral_stats" AS (SELECT u.id AS user_id, u.referral_code, count(DISTINCT r.id) AS total_referrals, count(DISTINCT CASE WHEN r.status::text = 'completed'::text THEN r.id ELSE NULL::integer END) AS completed_referrals, count(DISTINCT CASE WHEN r.status::text = 'pending'::text THEN r.id ELSE NULL::integer END) AS pending_referrals, COALESCE(sum(rw.amount), 0::numeric) AS total_rewards, max(r.created_at) AS last_referral_date FROM users u LEFT JOIN referrals r ON u.id::text = r.referrer_id::text LEFT JOIN rewards rw ON u.id::text = rw.user_id::text AND rw.status::text = 'completed'::text GROUP BY u.id, u.referral_code);
*/