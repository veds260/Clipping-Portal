'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { clips, clipperProfiles, campaigns, campaignClipperAssignments } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fetchTweetByUrl, parseTweetId, checkTagCompliance } from '@/lib/twitter-api';

const submitClipSchema = z.object({
  campaignId: z.string().uuid(),
  platformPostUrl: z.string().url(),
});

export async function submitClip(data: z.infer<typeof submitClipSchema>) {
  const session = await auth();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = submitClipSchema.parse(data);

    // Get clipper profile
    const clipperProfile = await db.query.clipperProfiles.findFirst({
      where: eq(clipperProfiles.userId, session.user.id),
    });

    if (!clipperProfile) {
      return { error: 'Clipper profile not found' };
    }

    // Verify clipper is assigned to this campaign
    const assignment = await db.query.campaignClipperAssignments.findFirst({
      where: and(
        eq(campaignClipperAssignments.campaignId, validated.campaignId),
        eq(campaignClipperAssignments.clipperId, clipperProfile.id),
      ),
    });

    if (!assignment) {
      return { error: 'You are not assigned to this campaign' };
    }

    // Check max clips per clipper limit
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, validated.campaignId),
    });

    if (campaign?.maxClipsPerClipper && campaign.maxClipsPerClipper > 0) {
      const clipperClipsInCampaign = await db.query.clips.findMany({
        where: and(
          eq(clips.campaignId, validated.campaignId),
          eq(clips.clipperId, clipperProfile.id),
        ),
      });

      if (clipperClipsInCampaign.length >= campaign.maxClipsPerClipper) {
        return { error: `You have reached the maximum of ${campaign.maxClipsPerClipper} clips for this campaign` };
      }
    }

    // Parse tweet ID from URL
    const tweetId = parseTweetId(validated.platformPostUrl);
    if (!tweetId) {
      return { error: 'Invalid Twitter/X URL' };
    }

    // Check for duplicate URL
    const existingClip = await db.query.clips.findFirst({
      where: eq(clips.platformPostUrl, validated.platformPostUrl),
    });

    if (existingClip) {
      return {
        error: 'This URL has already been submitted',
        isDuplicate: true,
        existingClipId: existingClip.id,
      };
    }

    // Auto-detect platform from URL
    const platform = 'twitter' as const;

    // Fetch tweet metrics via Twitter API
    const tweetData = await fetchTweetByUrl(validated.platformPostUrl);

    // Use already-fetched campaign for tag compliance
    let tagCompliance = null;
    if (tweetData && campaign?.requiredTags && (campaign.requiredTags as string[]).length > 0) {
      tagCompliance = checkTagCompliance(
        tweetData.text,
        tweetData.entities,
        campaign.requiredTags as string[]
      );
    }

    const [newClip] = await db
      .insert(clips)
      .values({
        clipperId: clipperProfile.id,
        campaignId: validated.campaignId,
        platform,
        platformPostUrl: validated.platformPostUrl,
        platformPostId: tweetId,
        tweetId,
        tweetText: tweetData?.text || null,
        authorUsername: tweetData?.authorUsername || null,
        views: tweetData?.views || 0,
        likes: tweetData?.likes || 0,
        comments: tweetData?.replies || 0,
        shares: 0,
        retweets: tweetData?.retweets || 0,
        impressions: tweetData?.impressions || 0,
        metricsUpdatedAt: tweetData ? new Date() : null,
        tagCompliance,
        status: 'pending',
        isDuplicate: false,
        postedAt: tweetData?.createdAt ? new Date(tweetData.createdAt) : new Date(),
      })
      .returning();

    // Update clipper's submitted count
    await db
      .update(clipperProfiles)
      .set({
        clipsSubmitted: sql`clips_submitted + 1`,
        updatedAt: new Date(),
      })
      .where(eq(clipperProfiles.id, clipperProfile.id));

    revalidatePath('/clipper/clips');
    revalidatePath('/clipper');
    return { success: true, clipId: newClip.id };
  } catch (error) {
    console.error('Error submitting clip:', error);
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input' };
    }
    return { error: 'Failed to submit clip' };
  }
}

export async function approveClip(clipId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db
      .update(clips)
      .set({
        status: 'approved',
        approvedBy: session.user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clips.id, clipId));

    // Update clipper's approved count
    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId),
    });

    if (clip?.clipperId) {
      await db
        .update(clipperProfiles)
        .set({
          clipsApproved: sql`clips_approved + 1`,
          updatedAt: new Date(),
        })
        .where(eq(clipperProfiles.id, clip.clipperId));
    }

    revalidatePath('/admin/clips');
    return { success: true };
  } catch (error) {
    console.error('Error approving clip:', error);
    return { error: 'Failed to approve clip' };
  }
}

export async function rejectClip(clipId: string, reason: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db
      .update(clips)
      .set({
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(clips.id, clipId));

    revalidatePath('/admin/clips');
    return { success: true };
  } catch (error) {
    console.error('Error rejecting clip:', error);
    return { error: 'Failed to reject clip' };
  }
}

export async function refreshClipMetrics(clipId: string) {
  const session = await auth();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId),
      with: { campaign: true },
    });

    if (!clip || !clip.tweetId) {
      return { error: 'Clip not found or missing tweet ID' };
    }

    const tweetData = await fetchTweetByUrl(clip.platformPostUrl);
    if (!tweetData) {
      return { error: 'Failed to fetch tweet data' };
    }

    let tagCompliance = null;
    if (clip.campaign?.requiredTags && (clip.campaign.requiredTags as string[]).length > 0) {
      tagCompliance = checkTagCompliance(
        tweetData.text,
        tweetData.entities,
        clip.campaign.requiredTags as string[]
      );
    }

    await db
      .update(clips)
      .set({
        views: tweetData.views,
        likes: tweetData.likes,
        retweets: tweetData.retweets,
        comments: tweetData.replies,
        impressions: tweetData.impressions,
        tweetText: tweetData.text,
        tagCompliance,
        metricsUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clips.id, clipId));

    // Update clipper's total views
    if (clip.clipperId) {
      const clipperClips = await db.query.clips.findMany({
        where: eq(clips.clipperId, clip.clipperId),
      });
      const totalViews = clipperClips.reduce((sum, c) => sum + (c.views || 0), 0);
      const avgViews = clipperClips.length > 0 ? Math.round(totalViews / clipperClips.length) : 0;

      await db
        .update(clipperProfiles)
        .set({
          totalViews,
          avgViewsPerClip: avgViews,
          updatedAt: new Date(),
        })
        .where(eq(clipperProfiles.id, clip.clipperId));
    }

    revalidatePath('/admin/clips');
    revalidatePath('/clipper/clips');
    return { success: true, views: tweetData.views };
  } catch (error) {
    console.error('Error refreshing metrics:', error);
    return { error: 'Failed to refresh metrics' };
  }
}

export async function checkDuplicateUrl(url: string) {
  try {
    const existingClip = await db.query.clips.findFirst({
      where: eq(clips.platformPostUrl, url),
      with: {
        clipper: {
          with: {
            user: true,
          },
        },
      },
    });

    if (existingClip) {
      return {
        isDuplicate: true,
        clipId: existingClip.id,
        clipperName: existingClip.clipper?.user?.name || 'Unknown',
        submittedAt: existingClip.createdAt,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking duplicate:', error);
    return { isDuplicate: false };
  }
}
