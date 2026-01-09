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
ALTER TABLE "job_interactions" ADD CONSTRAINT "job_interactions_job_id_job_posts_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_job_id_job_posts_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_interactions_user_id_idx" ON "job_interactions" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "job_interactions_job_id_idx" ON "job_interactions" USING btree ("job_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "job_interactions_type_idx" ON "job_interactions" USING btree ("interaction_type" text_ops);--> statement-breakpoint
CREATE INDEX "job_interactions_created_at_idx" ON "job_interactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "job_interactions_session_idx" ON "job_interactions" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "job_interactions_user_job_idx" ON "job_interactions" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "recommendation_feedback_user_idx" ON "recommendation_feedback" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "recommendation_feedback_job_idx" ON "recommendation_feedback" USING btree ("job_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "search_queries_user_id_idx" ON "search_queries" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "search_queries_created_at_idx" ON "search_queries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "search_queries_session_idx" ON "search_queries" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "user_profiles_last_active_idx" ON "user_profiles" USING btree ("last_active");