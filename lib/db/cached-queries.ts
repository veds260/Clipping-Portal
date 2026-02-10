import { cache } from 'react';
import { db } from './index';
import {
  clips,
  clipperProfiles,
  campaigns,
  campaignClipperAssignments,
  clipperPayouts,
  platformSettings,
  users
} from './schema';
import { eq, desc, sql, and } from 'drizzle-orm';

/**
 * Cached database queries using React's cache() function.
 * These queries are automatically deduplicated during the same server render,
 * meaning if multiple components request the same data, it's only fetched once.
 */

// ============================================
// Platform Settings
// ============================================

export const getCachedPlatformSettings = cache(async (key: string) => {
  return db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, key),
  });
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
// Campaign Queries
// ============================================

export const getCachedCampaignById = cache(async (campaignId: string) => {
  return db.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId),
    with: {
      assignments: {
        with: {
          clipper: {
            with: {
              user: true,
            },
          },
        },
      },
    },
  });
});

export const getCachedActiveCampaigns = cache(async () => {
  return db.query.campaigns.findMany({
    where: eq(campaigns.status, 'active'),
    orderBy: [desc(campaigns.createdAt)],
  });
});

// ============================================
// Campaign Assignment Queries
// ============================================

export const getCachedClipperCampaigns = cache(async (clipperId: string) => {
  return db.query.campaignClipperAssignments.findMany({
    where: eq(campaignClipperAssignments.clipperId, clipperId),
    with: {
      campaign: true,
    },
  });
});

export const getCachedCampaignAssignment = cache(async (campaignId: string, clipperId: string) => {
  return db.query.campaignClipperAssignments.findFirst({
    where: and(
      eq(campaignClipperAssignments.campaignId, campaignId),
      eq(campaignClipperAssignments.clipperId, clipperId),
    ),
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
// Paginated Queries
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

export const getPaginatedClips = cache(async (
  params: PaginationParams & {
    status?: 'pending' | 'approved' | 'rejected' | 'paid';
    clipperId?: string;
    campaignId?: string;
  }
): Promise<PaginatedResult<typeof clips.$inferSelect>> => {
  const { page, pageSize, status, clipperId, campaignId } = params;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (status) conditions.push(eq(clips.status, status));
  if (clipperId) conditions.push(eq(clips.clipperId, clipperId));
  if (campaignId) conditions.push(eq(clips.campaignId, campaignId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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

export const getPaginatedClippers = cache(async (
  params: PaginationParams & {
    status?: 'active' | 'suspended' | 'pending';
    tier?: 'tier1' | 'tier2' | 'tier3';
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
