'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { clips, clipperProfiles, users, campaigns } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateMetricsSchema = z.object({
  clipId: z.string().uuid(),
  views: z.number().min(0),
  likes: z.number().min(0).optional(),
  comments: z.number().min(0).optional(),
  shares: z.number().min(0).optional(),
});

const submitClipSchema = z.object({
  platform: z.enum(['tiktok', 'instagram', 'youtube_shorts', 'twitter']),
  platformPostUrl: z.string().url(),
  hook: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  campaignId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  isFillerContent: z.boolean().optional(),
  sourceCreator: z.string().optional(),
});

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

export async function updateClipMetrics(data: z.infer<typeof updateMetricsSchema>) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = updateMetricsSchema.parse(data);

    await db
      .update(clips)
      .set({
        views: validated.views,
        likes: validated.likes,
        comments: validated.comments,
        shares: validated.shares,
        metricsUpdatedAt: new Date(),
        metricsUpdatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(clips.id, validated.clipId));

    // Update clipper's total views
    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, validated.clipId),
    });

    if (clip?.clipperId) {
      // Recalculate clipper's total views
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
    return { success: true };
  } catch (error) {
    console.error('Error updating metrics:', error);
    return { error: 'Failed to update metrics' };
  }
}

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

    // Check for duplicate URL
    const existingClip = await db.query.clips.findFirst({
      where: eq(clips.platformPostUrl, validated.platformPostUrl),
    });

    if (existingClip) {
      // Return error with info about the duplicate
      return {
        error: 'This URL has already been submitted',
        isDuplicate: true,
        existingClipId: existingClip.id,
      };
    }

    // If campaign is selected, get the clientId from the campaign
    let clientId = validated.clientId;
    if (validated.campaignId && !clientId) {
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, validated.campaignId),
      });
      if (campaign?.clientId) {
        clientId = campaign.clientId;
      }
    }

    const [newClip] = await db
      .insert(clips)
      .values({
        clipperId: clipperProfile.id,
        platform: validated.platform,
        platformPostUrl: validated.platformPostUrl,
        hook: validated.hook,
        title: validated.title,
        description: validated.description,
        campaignId: validated.campaignId,
        clientId: clientId,
        channelId: validated.channelId,
        isFillerContent: validated.isFillerContent || false,
        sourceCreator: validated.sourceCreator,
        status: 'pending',
        isDuplicate: false,
        postedAt: new Date(),
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
    return { success: true, clipId: newClip.id };
  } catch (error) {
    console.error('Error submitting clip:', error);
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input' };
    }
    return { error: 'Failed to submit clip' };
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

export async function scanForDuplicates() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    // Get all clips grouped by URL
    const allClips = await db.query.clips.findMany({
      orderBy: [desc(clips.createdAt)],
    });

    // Group clips by URL
    const urlMap = new Map<string, typeof allClips>();
    for (const clip of allClips) {
      const url = clip.platformPostUrl;
      if (!urlMap.has(url)) {
        urlMap.set(url, []);
      }
      urlMap.get(url)!.push(clip);
    }

    // Find duplicates and update them
    let duplicatesFound = 0;
    for (const [url, clipsWithUrl] of urlMap) {
      if (clipsWithUrl.length > 1) {
        // Sort by creation date, oldest first
        clipsWithUrl.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });

        // First clip is original, rest are duplicates
        const originalClipId = clipsWithUrl[0].id;

        for (let i = 1; i < clipsWithUrl.length; i++) {
          const duplicateClip = clipsWithUrl[i];
          if (!duplicateClip.isDuplicate) {
            await db
              .update(clips)
              .set({
                isDuplicate: true,
                duplicateOfClipId: originalClipId,
                updatedAt: new Date(),
              })
              .where(eq(clips.id, duplicateClip.id));
            duplicatesFound++;
          }
        }
      }
    }

    revalidatePath('/admin/clips');
    return { success: true, duplicatesFound };
  } catch (error) {
    console.error('Error scanning for duplicates:', error);
    return { error: 'Failed to scan for duplicates' };
  }
}

export async function updateClipperMetrics(clipId: string, views: number) {
  const session = await auth();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    // Get clipper profile
    const clipperProfile = await db.query.clipperProfiles.findFirst({
      where: eq(clipperProfiles.userId, session.user.id),
    });

    if (!clipperProfile) {
      return { error: 'Clipper profile not found' };
    }

    // Verify clip belongs to this clipper
    const clip = await db.query.clips.findFirst({
      where: and(eq(clips.id, clipId), eq(clips.clipperId, clipperProfile.id)),
    });

    if (!clip) {
      return { error: 'Clip not found' };
    }

    await db
      .update(clips)
      .set({
        views,
        metricsUpdatedAt: new Date(),
        metricsUpdatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(clips.id, clipId));

    revalidatePath('/clipper/clips');
    return { success: true };
  } catch (error) {
    console.error('Error updating clipper metrics:', error);
    return { error: 'Failed to update metrics' };
  }
}
