import { pgTable, uuid, varchar, text, timestamp, decimal, integer, bigint, boolean, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'clipper', 'client']);
export const clipperTierEnum = pgEnum('clipper_tier', ['entry', 'approved', 'core']);
export const clipperStatusEnum = pgEnum('clipper_status', ['active', 'suspended', 'pending']);
export const sourceContentTypeEnum = pgEnum('source_content_type', ['podcast', 'interview', 'livestream', 'other']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed']);
export const platformEnum = pgEnum('platform', ['tiktok', 'instagram', 'youtube_shorts', 'twitter']);
export const clipStatusEnum = pgEnum('clip_status', ['pending', 'approved', 'rejected', 'paid']);
export const payoutBatchStatusEnum = pgEnum('payout_batch_status', ['draft', 'processing', 'completed', 'cancelled']);
export const clipperPayoutStatusEnum = pgEnum('clipper_payout_status', ['pending', 'paid']);
export const channelStatusEnum = pgEnum('channel_status', ['active', 'paused', 'growing']);

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
});

// Clipper profiles
export const clipperProfiles = pgTable('clipper_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tier: clipperTierEnum('tier').default('entry'),
  telegramHandle: varchar('telegram_handle', { length: 100 }),
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
});

// Clients
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  brandName: varchar('brand_name', { length: 255 }),
  twitterHandle: varchar('twitter_handle', { length: 100 }),
  logoUrl: text('logo_url'),
  monthlyBudget: decimal('monthly_budget', { precision: 10, scale: 2 }),
  budgetSpentThisMonth: decimal('budget_spent_this_month', { precision: 10, scale: 2 }).default('0'),
  payRatePer1k: decimal('pay_rate_per_1k', { precision: 5, scale: 2 }),
  contentGuidelines: text('content_guidelines'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Campaigns
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  sourceContentUrl: text('source_content_url'),
  sourceContentType: sourceContentTypeEnum('source_content_type'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  budgetCap: decimal('budget_cap', { precision: 10, scale: 2 }),
  payRatePer1k: decimal('pay_rate_per_1k', { precision: 5, scale: 2 }),
  status: campaignStatusEnum('status').default('draft'),
  tierRequirement: clipperTierEnum('tier_requirement'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Distribution Channels (owned by Compound)
export const distributionChannels = pgTable('distribution_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(), // e.g., "Crypto Alpha"
  niche: varchar('niche', { length: 100 }).notNull(), // e.g., "crypto", "ai", "finance"
  description: text('description'),

  // Platform accounts for this channel
  tiktokHandle: varchar('tiktok_handle', { length: 100 }),
  tiktokUrl: text('tiktok_url'),
  tiktokFollowers: integer('tiktok_followers').default(0),

  instagramHandle: varchar('instagram_handle', { length: 100 }),
  instagramUrl: text('instagram_url'),
  instagramFollowers: integer('instagram_followers').default(0),

  youtubeHandle: varchar('youtube_handle', { length: 100 }),
  youtubeUrl: text('youtube_url'),
  youtubeSubscribers: integer('youtube_subscribers').default(0),

  twitterHandle: varchar('twitter_handle', { length: 100 }),
  twitterUrl: text('twitter_url'),
  twitterFollowers: integer('twitter_followers').default(0),

  // Aggregate stats
  totalFollowers: integer('total_followers').default(0),
  totalClipsPosted: integer('total_clips_posted').default(0),
  totalViews: bigint('total_views', { mode: 'number' }).default(0),

  // Management
  status: channelStatusEnum('status').default('growing'),
  tierRequired: clipperTierEnum('tier_required').default('core'), // Who can post to this channel
  contentGuidelines: text('content_guidelines'), // Channel-specific guidelines
  targetAudience: text('target_audience'),
  exampleContent: text('example_content'), // Examples of what works

  // For non-client content (filler/growth content)
  allowsFillerContent: boolean('allows_filler_content').default(true),
  fillerContentSources: text('filler_content_sources'), // Popular accounts to clip from

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Clips
export const clips = pgTable('clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  clipperId: uuid('clipper_id').references(() => clipperProfiles.id, { onDelete: 'set null' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  channelId: uuid('channel_id').references(() => distributionChannels.id, { onDelete: 'set null' }),

  // Content type
  isFillerContent: boolean('is_filler_content').default(false), // True if not client content
  sourceCreator: varchar('source_creator', { length: 255 }), // Who was clipped (for filler)

  // Content metadata
  title: varchar('title', { length: 255 }),
  hook: text('hook'),
  description: text('description'),
  durationSeconds: integer('duration_seconds'),
  thumbnailUrl: text('thumbnail_url'),

  // Platform posting info
  platform: platformEnum('platform').notNull(),
  platformPostUrl: text('platform_post_url').notNull(),
  platformPostId: varchar('platform_post_id', { length: 255 }),

  // Metrics
  views: integer('views').default(0),
  likes: integer('likes').default(0),
  comments: integer('comments').default(0),
  shares: integer('shares').default(0),
  metricsUpdatedAt: timestamp('metrics_updated_at'),
  metricsUpdatedBy: uuid('metrics_updated_by').references(() => users.id),
  metricsScreenshotUrl: text('metrics_screenshot_url'),

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
  index('idx_clips_platform_url').on(table.platformPostUrl),
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
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  campaigns: many(campaigns),
  clips: many(clips),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  client: one(clients, {
    fields: [campaigns.clientId],
    references: [clients.id],
  }),
  clips: many(clips),
}));

export const distributionChannelsRelations = relations(distributionChannels, ({ many }) => ({
  clips: many(clips),
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
  client: one(clients, {
    fields: [clips.clientId],
    references: [clients.id],
  }),
  channel: one(distributionChannels, {
    fields: [clips.channelId],
    references: [distributionChannels.id],
  }),
  metricsUpdater: one(users, {
    fields: [clips.metricsUpdatedBy],
    references: [users.id],
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
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ClipperProfile = typeof clipperProfiles.$inferSelect;
export type NewClipperProfile = typeof clipperProfiles.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type Clip = typeof clips.$inferSelect;
export type NewClip = typeof clips.$inferInsert;
export type PayoutBatch = typeof payoutBatches.$inferSelect;
export type NewPayoutBatch = typeof payoutBatches.$inferInsert;
export type ClipperPayout = typeof clipperPayouts.$inferSelect;
export type NewClipperPayout = typeof clipperPayouts.$inferInsert;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type DistributionChannel = typeof distributionChannels.$inferSelect;
export type NewDistributionChannel = typeof distributionChannels.$inferInsert;
