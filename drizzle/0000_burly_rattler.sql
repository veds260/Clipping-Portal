CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."channel_status" AS ENUM('active', 'paused', 'growing');--> statement-breakpoint
CREATE TYPE "public"."clip_status" AS ENUM('pending', 'approved', 'rejected', 'paid');--> statement-breakpoint
CREATE TYPE "public"."clipper_payout_status" AS ENUM('pending', 'paid');--> statement-breakpoint
CREATE TYPE "public"."clipper_status" AS ENUM('active', 'suspended', 'pending');--> statement-breakpoint
CREATE TYPE "public"."clipper_tier" AS ENUM('entry', 'approved', 'core');--> statement-breakpoint
CREATE TYPE "public"."payout_batch_status" AS ENUM('draft', 'processing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('tiktok', 'instagram', 'youtube_shorts', 'twitter');--> statement-breakpoint
CREATE TYPE "public"."source_content_type" AS ENUM('podcast', 'interview', 'livestream', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'clipper', 'client');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"source_content_url" text,
	"source_content_type" "source_content_type",
	"start_date" timestamp,
	"end_date" timestamp,
	"budget_cap" numeric(10, 2),
	"pay_rate_per_1k" numeric(5, 2),
	"status" "campaign_status" DEFAULT 'draft',
	"tier_requirement" "clipper_tier",
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"brand_name" varchar(255),
	"twitter_handle" varchar(100),
	"logo_url" text,
	"monthly_budget" numeric(10, 2),
	"budget_spent_this_month" numeric(10, 2) DEFAULT '0',
	"pay_rate_per_1k" numeric(5, 2),
	"content_guidelines" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clipper_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid,
	"clipper_id" uuid,
	"total_views" bigint DEFAULT 0,
	"clips_count" integer DEFAULT 0,
	"amount" numeric(10, 2) NOT NULL,
	"bonus_amount" numeric(10, 2) DEFAULT '0',
	"status" "clipper_payout_status" DEFAULT 'pending',
	"paid_at" timestamp,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clipper_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" "clipper_tier" DEFAULT 'entry',
	"telegram_handle" varchar(100),
	"total_views" bigint DEFAULT 0,
	"total_earnings" numeric(10, 2) DEFAULT '0',
	"clips_submitted" integer DEFAULT 0,
	"clips_approved" integer DEFAULT 0,
	"avg_views_per_clip" integer DEFAULT 0,
	"status" "clipper_status" DEFAULT 'pending',
	"notes" text,
	"onboarded_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"clipper_id" uuid,
	"client_id" uuid,
	"channel_id" uuid,
	"is_filler_content" boolean DEFAULT false,
	"source_creator" varchar(255),
	"title" varchar(255),
	"hook" text,
	"description" text,
	"duration_seconds" integer,
	"thumbnail_url" text,
	"platform" "platform" NOT NULL,
	"platform_post_url" text NOT NULL,
	"platform_post_id" varchar(255),
	"views" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"metrics_updated_at" timestamp,
	"metrics_updated_by" uuid,
	"metrics_screenshot_url" text,
	"status" "clip_status" DEFAULT 'pending',
	"rejection_reason" text,
	"approved_by" uuid,
	"approved_at" timestamp,
	"payout_amount" numeric(10, 2),
	"payout_batch_id" uuid,
	"posted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "distribution_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"niche" varchar(100) NOT NULL,
	"description" text,
	"tiktok_handle" varchar(100),
	"tiktok_url" text,
	"tiktok_followers" integer DEFAULT 0,
	"instagram_handle" varchar(100),
	"instagram_url" text,
	"instagram_followers" integer DEFAULT 0,
	"youtube_handle" varchar(100),
	"youtube_url" text,
	"youtube_subscribers" integer DEFAULT 0,
	"twitter_handle" varchar(100),
	"twitter_url" text,
	"twitter_followers" integer DEFAULT 0,
	"total_followers" integer DEFAULT 0,
	"total_clips_posted" integer DEFAULT 0,
	"total_views" bigint DEFAULT 0,
	"status" "channel_status" DEFAULT 'growing',
	"tier_required" "clipper_tier" DEFAULT 'core',
	"content_guidelines" text,
	"target_audience" text,
	"example_content" text,
	"allows_filler_content" boolean DEFAULT true,
	"filler_content_sources" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payout_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0',
	"clips_count" integer DEFAULT 0,
	"status" "payout_batch_status" DEFAULT 'draft',
	"processed_by" uuid,
	"processed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"name" varchar(255),
	"avatar_url" text,
	"role" "user_role" DEFAULT 'clipper' NOT NULL,
	"twitter_handle" varchar(100),
	"twitter_id" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clipper_payouts" ADD CONSTRAINT "clipper_payouts_batch_id_payout_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."payout_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clipper_payouts" ADD CONSTRAINT "clipper_payouts_clipper_id_clipper_profiles_id_fk" FOREIGN KEY ("clipper_id") REFERENCES "public"."clipper_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clipper_profiles" ADD CONSTRAINT "clipper_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_clipper_id_clipper_profiles_id_fk" FOREIGN KEY ("clipper_id") REFERENCES "public"."clipper_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_channel_id_distribution_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."distribution_channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_metrics_updated_by_users_id_fk" FOREIGN KEY ("metrics_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_batches" ADD CONSTRAINT "payout_batches_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_log_user" ON "activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_activity_log_created" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_clipper_payouts_batch" ON "clipper_payouts" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_clips_clipper" ON "clips" USING btree ("clipper_id");--> statement-breakpoint
CREATE INDEX "idx_clips_campaign" ON "clips" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_clips_status" ON "clips" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_clips_posted_at" ON "clips" USING btree ("posted_at");