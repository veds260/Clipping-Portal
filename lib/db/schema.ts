import { pgTable, uuid, varchar, text, timestamp, decimal, integer, bigint, boolean, pgEnum, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'clipper']);
export const clipperTierEnum = pgEnum('clipper_tier', ['unassigned', 'tier1', 'tier2', 'tier3']);
export const clipperStatusEnum = pgEnum('clipper_status', ['active', 'suspended', 'pending']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed']);
export const platformEnum = pgEnum('platform', ['tiktok', 'instagram', 'youtube_shorts', 'twitter']);
export const clipStatusEnum = pgEnum('clip_status', ['pending', 'approved', 'rejected', 'paid']);
export const payoutBatchStatusEnum = pgEnum('payout_batch_status', ['draft', 'processing', 'completed', 'cancelled']);
export const clipperPayoutStatusEnum = pgEnum('clipper_payout_status', ['pending', 'paid']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('clipper'),
  twitterHandle: varchar('twitter_handle', { length: 100 }),
  twitterId: varchar('twitter_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_users_role').on(table.role),
  index('idx_users_created_at').on(table.createdAt),
]);

// Clipper profiles
export const clipperProfiles = pgTable('clipper_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tier: clipperTierEnum('tier').default('unassigned'),
  telegramHandle: varchar('telegram_handle', { length: 100 }),
  walletAddress: varchar('wallet_address', { length: 255 }),
  walletType: varchar('wallet_type', { length: 20 }),
  totalViews: bigint('total_views', { mode: 'number' }).default(0),
  totalEarnings: decimal('total_earnings', { precision: 10, scale: 2 }).default('0'),
  clipsSubmitted: integer('clips_submitted').default(0),
  clipsApproved: integer('clips_approved').default(0),
  avgViewsPerClip: integer('avg_views_per_clip').default(0),
  status: clipperStatusEnum('status').default('pending'),
  notes: text('notes'),
  onboardedAt: timestamp('onboarded_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_clipper_profiles_user').on(table.userId),
  index('idx_clipper_profiles_status').on(table.status),
  index('idx_clipper_profiles_tier').on(table.tier),
  index('idx_clipper_profiles_created_at').on(table.createdAt),
]);

// Campaigns (admin-managed, per-campaign tier rates and caps)
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  brandName: varchar('brand_name', { length: 255 }),
  brandLogoUrl: text('brand_logo_url'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  budgetCap: decimal('budget_cap', { precision: 10, scale: 2 }),
  status: campaignStatusEnum('status').default('draft'),

  // Per-tier payment rates
  tier1CpmRate: decimal('tier1_cpm_rate', { precision: 5, scale: 2 }).default('0'),
  tier2CpmRate: decimal('tier2_cpm_rate', { precision: 5, scale: 2 }).default('0'),
  tier3FixedRate: decimal('tier3_fixed_rate', { precision: 10, scale: 2 }).default('0'),

  // Anti-gaming caps per tier
  tier1MaxPerClip: decimal('tier1_max_per_clip', { precision: 10, scale: 2 }),
  tier2MaxPerClip: decimal('tier2_max_per_clip', { precision: 10, scale: 2 }),
  tier1MaxPerCampaign: decimal('tier1_max_per_campaign', { precision: 10, scale: 2 }),
  tier2MaxPerCampaign: decimal('tier2_max_per_campaign', { precision: 10, scale: 2 }),
  tier3MaxPerCampaign: decimal('tier3_max_per_campaign', { precision: 10, scale: 2 }),

  // Tag detection
  requiredTags: jsonb('required_tags').$type<string[]>().default([]),

  // Guidelines
  contentGuidelines: text('content_guidelines'),
  notionUrl: text('notion_url'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_campaigns_status').on(table.status),
  index('idx_campaigns_created_at').on(table.createdAt),
]);

// Campaign-Clipper assignments (which clippers are in which campaigns at what tier)
export const campaignClipperAssignments = pgTable('campaign_clipper_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  clipperId: uuid('clipper_id').references(() => clipperProfiles.id, { onDelete: 'cascade' }).notNull(),
  assignedTier: clipperTierEnum('assigned_tier').notNull(),
  totalEarnedInCampaign: decimal('total_earned_in_campaign', { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  uniqueIndex('idx_assignment_campaign_clipper').on(table.campaignId, table.clipperId),
  index('idx_assignments_campaign').on(table.campaignId),
  index('idx_assignments_clipper').on(table.clipperId),
]);

// Clips
export const clips = pgTable('clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  clipperId: uuid('clipper_id').references(() => clipperProfiles.id, { onDelete: 'set null' }),

  // Platform posting info
  platform: platformEnum('platform').notNull(),
  platformPostUrl: text('platform_post_url').notNull(),
  platformPostId: varchar('platform_post_id', { length: 255 }),
  tweetId: varchar('tweet_id', { length: 255 }),
  tweetText: text('tweet_text'),
  authorUsername: varchar('author_username', { length: 255 }),

  // Metrics (auto-fetched via Twitter API)
  views: integer('views').default(0),
  likes: integer('likes').default(0),
  comments: integer('comments').default(0),
  shares: integer('shares').default(0),
  retweets: integer('retweets').default(0),
  impressions: integer('impressions').default(0),
  metricsUpdatedAt: timestamp('metrics_updated_at'),

  // Tag compliance
  tagCompliance: jsonb('tag_compliance').$type<{ compliant: boolean; found: string[]; missing: string[] }>(),

  // Status and approval
  status: clipStatusEnum('status').default('pending'),
  rejectionReason: text('rejection_reason'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),

  // Payout tracking
  payoutAmount: decimal('payout_amount', { precision: 10, scale: 2 }),
  payoutBatchId: uuid('payout_batch_id'),

  // Duplicate detection
  isDuplicate: boolean('is_duplicate').default(false),
  duplicateOfClipId: uuid('duplicate_of_clip_id'),

  postedAt: timestamp('posted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_clips_clipper').on(table.clipperId),
  index('idx_clips_campaign').on(table.campaignId),
  index('idx_clips_status').on(table.status),
  index('idx_clips_posted_at').on(table.postedAt),
  index('idx_clips_created_at').on(table.createdAt),
  index('idx_clips_platform_url').on(table.platformPostUrl),
  index('idx_clips_tweet_id').on(table.tweetId),
  index('idx_clips_status_created').on(table.status, table.createdAt),
  index('idx_clips_clipper_status').on(table.clipperId, table.status),
]);

// Payout batches
export const payoutBatches = pgTable('payout_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).default('0'),
  clipsCount: integer('clips_count').default(0),
  status: payoutBatchStatusEnum('status').default('draft'),
  processedBy: uuid('processed_by').references(() => users.id),
  processedAt: timestamp('processed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Clipper payouts
export const clipperPayouts = pgTable('clipper_payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchId: uuid('batch_id').references(() => payoutBatches.id, { onDelete: 'cascade' }),
  clipperId: uuid('clipper_id').references(() => clipperProfiles.id, { onDelete: 'set null' }),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  totalViews: bigint('total_views', { mode: 'number' }).default(0),
  clipsCount: integer('clips_count').default(0),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  bonusAmount: decimal('bonus_amount', { precision: 10, scale: 2 }).default('0'),
  status: clipperPayoutStatusEnum('status').default('pending'),
  paidAt: timestamp('paid_at'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_clipper_payouts_batch').on(table.batchId),
  index('idx_clipper_payouts_clipper').on(table.clipperId),
  index('idx_clipper_payouts_campaign').on(table.campaignId),
  index('idx_clipper_payouts_status').on(table.status),
]);

// Platform settings
export const platformSettings = pgTable('platform_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: jsonb('value').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Activity log
export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_activity_log_user').on(table.userId),
  index('idx_activity_log_created').on(table.createdAt),
]);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  clipperProfile: one(clipperProfiles, {
    fields: [users.id],
    references: [clipperProfiles.userId],
  }),
  activityLogs: many(activityLog),
}));

export const clipperProfilesRelations = relations(clipperProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [clipperProfiles.userId],
    references: [users.id],
  }),
  clips: many(clips),
  payouts: many(clipperPayouts),
  campaignAssignments: many(campaignClipperAssignments),
}));

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  clips: many(clips),
  assignments: many(campaignClipperAssignments),
}));

export const campaignClipperAssignmentsRelations = relations(campaignClipperAssignments, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignClipperAssignments.campaignId],
    references: [campaigns.id],
  }),
  clipper: one(clipperProfiles, {
    fields: [campaignClipperAssignments.clipperId],
    references: [clipperProfiles.id],
  }),
}));

export const clipsRelations = relations(clips, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [clips.campaignId],
    references: [campaigns.id],
  }),
  clipper: one(clipperProfiles, {
    fields: [clips.clipperId],
    references: [clipperProfiles.id],
  }),
  approver: one(users, {
    fields: [clips.approvedBy],
    references: [users.id],
  }),
}));

export const payoutBatchesRelations = relations(payoutBatches, ({ one, many }) => ({
  processor: one(users, {
    fields: [payoutBatches.processedBy],
    references: [users.id],
  }),
  clipperPayouts: many(clipperPayouts),
}));

export const clipperPayoutsRelations = relations(clipperPayouts, ({ one }) => ({
  batch: one(payoutBatches, {
    fields: [clipperPayouts.batchId],
    references: [payoutBatches.id],
  }),
  clipper: one(clipperProfiles, {
    fields: [clipperPayouts.clipperId],
    references: [clipperProfiles.id],
  }),
  campaign: one(campaigns, {
    fields: [clipperPayouts.campaignId],
    references: [campaigns.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ClipperProfile = typeof clipperProfiles.$inferSelect;
export type NewClipperProfile = typeof clipperProfiles.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CampaignClipperAssignment = typeof campaignClipperAssignments.$inferSelect;
export type NewCampaignClipperAssignment = typeof campaignClipperAssignments.$inferInsert;
export type Clip = typeof clips.$inferSelect;
export type NewClip = typeof clips.$inferInsert;
export type PayoutBatch = typeof payoutBatches.$inferSelect;
export type NewPayoutBatch = typeof payoutBatches.$inferInsert;
export type ClipperPayout = typeof clipperPayouts.$inferSelect;
export type NewClipperPayout = typeof clipperPayouts.$inferInsert;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
