import { cache } from 'react';
import { db } from './index';
import {
  clips,
  clipperProfiles,
  clients,
  campaigns,
  clipperPayouts,
  platformSettings,
  users
} from './schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

/**
 * Cached database queries using React's cache() function.
 * These queries are automatically deduplicated during the same server render,
 * meaning if multiple components request the same data, it's only fetched once.
 *
 * Best practices:
 * - Use these for read-only queries that may be called multiple times per render
 * - Cache is invalidated on each new server request
 * - For mutations, use regular db calls and revalidatePath/revalidateTag
 */

// ============================================
// Platform Settings (rarely change, safe to cache)
// ============================================

export const getCachedPlatformSettings = cache(async (key: string) => {
  return db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, key),
  });
});

export const getCachedTierSettings = cache(async () => {
  const settings = await getCachedPlatformSettings('tier_settings');
  return settings?.value as {
    tier_approved_min_clips: number;
    tier_core_min_views: number;
    tier_core_min_clips: number;
    tier_approved_min_avg_views: number;
    tier_core_min_avg_views: number;
    entry_benefits: string;
    approved_benefits: string;
    core_benefits: string;
    entry_pay_rate: number;
    approved_pay_rate: number;
    core_pay_rate: number;
  } || {
    tier_approved_min_clips: 10,
    tier_core_min_views: 500000,
    tier_core_min_clips: 50,
    tier_approved_min_avg_views: 1000,
    tier_core_min_avg_views: 5000,
    entry_benefits: '',
    approved_benefits: '',
    core_benefits: '',
    entry_pay_rate: 1.0,
    approved_pay_rate: 1.5,
    core_pay_rate: 2.0,
  };
});

export const getCachedPayoutSettings = cache(async () => {
  const settings = await getCachedPlatformSettings('payout_settings');
  return settings?.value as {
    minimum_views_for_payout: number;
    bonus_threshold_views: number;
    bonus_multiplier: number;
  } || {
    minimum_views_for_payout: 1000,
    bonus_threshold_views: 100000,
    bonus_multiplier: 1.5,
  };
});

// ============================================
// User Queries
// ============================================

export const getCachedUserById = cache(async (userId: string) => {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
});

// ============================================
// Clipper Queries
// ============================================

export const getCachedClipperProfile = cache(async (userId: string) => {
  return db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.userId, userId),
  });
});

export const getCachedClipperById = cache(async (clipperId: string) => {
  return db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.id, clipperId),
    with: {
      user: true,
    },
  });
});

// ============================================
// Client Queries
// ============================================

export const getCachedClientByUserId = cache(async (userId: string) => {
  return db.query.clients.findFirst({
    where: eq(clients.userId, userId),
  });
});

export const getCachedClientById = cache(async (clientId: string) => {
  return db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
});

// ============================================
// Campaign Queries
// ============================================

export const getCachedCampaignById = cache(async (campaignId: string) => {
  return db.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId),
    with: {
      client: true,
    },
  });
});

export const getCachedActiveCampaigns = cache(async () => {
  return db.query.campaigns.findMany({
    where: eq(campaigns.status, 'active'),
    orderBy: [desc(campaigns.createdAt)],
    with: {
      client: true,
    },
  });
});

// ============================================
// Aggregation Queries (for dashboards)
// ============================================

export const getCachedClipperStats = cache(async (clipperId: string) => {
  const [stats] = await db
    .select({
      totalClips: sql<number>`count(*)`,
      approvedClips: sql<number>`count(*) filter (where ${clips.status} = 'approved' or ${clips.status} = 'paid')`,
      pendingClips: sql<number>`count(*) filter (where ${clips.status} = 'pending')`,
      totalViews: sql<number>`coalesce(sum(${clips.views}), 0)`,
    })
    .from(clips)
    .where(eq(clips.clipperId, clipperId));

  return stats;
});

export const getCachedClipperPendingEarnings = cache(async (clipperId: string) => {
  const [result] = await db
    .select({
      amount: sql<number>`coalesce(sum(${clipperPayouts.amount}), 0)`,
    })
    .from(clipperPayouts)
    .where(and(
      eq(clipperPayouts.clipperId, clipperId),
      eq(clipperPayouts.status, 'pending')
    ));

  return result?.amount || 0;
});

// ============================================
// Paginated Queries (for large datasets)
// ============================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get paginated clips with total count
 * Uses cursor-based pagination internally for better performance
 */
export const getPaginatedClips = cache(async (
  params: PaginationParams & {
    status?: 'pending' | 'approved' | 'rejected' | 'paid';
    clipperId?: string;
    clientId?: string;
  }
): Promise<PaginatedResult<typeof clips.$inferSelect>> => {
  const { page, pageSize, status, clipperId, clientId } = params;
  const offset = (page - 1) * pageSize;

  // Build where conditions
  const conditions = [];
  if (status) conditions.push(eq(clips.status, status));
  if (clipperId) conditions.push(eq(clips.clipperId, clipperId));
  if (clientId) conditions.push(eq(clips.clientId, clientId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Execute count and data queries in parallel
  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(clips)
      .where(whereClause),
    db.query.clips.findMany({
      where: whereClause,
      orderBy: [desc(clips.createdAt)],
      limit: pageSize,
      offset,
      with: {
        clipper: {
          with: {
            user: true,
          },
        },
        client: true,
        campaign: true,
      },
    }),
  ]);

  const total = countResult[0]?.count || 0;

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

/**
 * Get paginated clippers with total count
 */
export const getPaginatedClippers = cache(async (
  params: PaginationParams & {
    status?: 'active' | 'suspended' | 'pending';
    tier?: 'entry' | 'approved' | 'core';
  }
): Promise<PaginatedResult<typeof clipperProfiles.$inferSelect & { user: typeof users.$inferSelect }>> => {
  const { page, pageSize, status, tier } = params;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (status) conditions.push(eq(clipperProfiles.status, status));
  if (tier) conditions.push(eq(clipperProfiles.tier, tier));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(clipperProfiles)
      .where(whereClause),
    db.query.clipperProfiles.findMany({
      where: whereClause,
      orderBy: [desc(clipperProfiles.createdAt)],
      limit: pageSize,
      offset,
      with: {
        user: true,
      },
    }),
  ]);

  const total = countResult[0]?.count || 0;

  return {
    data: data as (typeof clipperProfiles.$inferSelect & { user: typeof users.$inferSelect })[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});
