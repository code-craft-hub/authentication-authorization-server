CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"token" varchar(500) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ALTER COLUMN "user_id" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "years_of_experience" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "education" jsonb;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "certifications" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_token" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_token_expiry" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" varchar(10) DEFAULT 'true' NOT NULL;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens" USING btree ("token" text_ops);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code");