'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { distributionChannels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const channelSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  niche: z.string().min(1, 'Niche is required'),
  description: z.string().optional(),
  tiktokHandle: z.string().optional(),
  tiktokUrl: z.string().optional(),
  tiktokFollowers: z.number().optional(),
  instagramHandle: z.string().optional(),
  instagramUrl: z.string().optional(),
  instagramFollowers: z.number().optional(),
  youtubeHandle: z.string().optional(),
  youtubeUrl: z.string().optional(),
  youtubeSubscribers: z.number().optional(),
  twitterHandle: z.string().optional(),
  twitterUrl: z.string().optional(),
  twitterFollowers: z.number().optional(),
  status: z.enum(['active', 'paused', 'growing']).optional(),
  tierRequired: z.enum(['entry', 'approved', 'core']).optional(),
  contentGuidelines: z.string().optional(),
  targetAudience: z.string().optional(),
  exampleContent: z.string().optional(),
  allowsFillerContent: z.boolean().optional(),
  fillerContentSources: z.string().optional(),
});

export async function createChannel(data: z.infer<typeof channelSchema>) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = channelSchema.parse(data);

    // Calculate total followers
    const totalFollowers =
      (validated.tiktokFollowers || 0) +
      (validated.instagramFollowers || 0) +
      (validated.youtubeSubscribers || 0) +
      (validated.twitterFollowers || 0);

    const [channel] = await db.insert(distributionChannels).values({
      ...validated,
      totalFollowers,
    }).returning();

    revalidatePath('/admin/channels');
    return { success: true, channelId: channel.id };
  } catch (error) {
    console.error('Error creating channel:', error);
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Failed to create channel' };
  }
}

export async function updateChannel(channelId: string, data: z.infer<typeof channelSchema>) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = channelSchema.parse(data);

    // Calculate total followers
    const totalFollowers =
      (validated.tiktokFollowers || 0) +
      (validated.instagramFollowers || 0) +
      (validated.youtubeSubscribers || 0) +
      (validated.twitterFollowers || 0);

    await db
      .update(distributionChannels)
      .set({
        ...validated,
        totalFollowers,
        updatedAt: new Date(),
      })
      .where(eq(distributionChannels.id, channelId));

    revalidatePath('/admin/channels');
    revalidatePath(`/admin/channels/${channelId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating channel:', error);
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Failed to update channel' };
  }
}

export async function updateChannelStatus(channelId: string, status: 'active' | 'paused' | 'growing') {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db
      .update(distributionChannels)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(distributionChannels.id, channelId));

    revalidatePath('/admin/channels');
    return { success: true };
  } catch (error) {
    console.error('Error updating channel status:', error);
    return { error: 'Failed to update channel status' };
  }
}

export async function deleteChannel(channelId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db
      .delete(distributionChannels)
      .where(eq(distributionChannels.id, channelId));

    revalidatePath('/admin/channels');
    return { success: true };
  } catch (error) {
    console.error('Error deleting channel:', error);
    return { error: 'Failed to delete channel' };
  }
}

export async function updateChannelMetrics(
  channelId: string,
  metrics: {
    tiktokFollowers?: number;
    instagramFollowers?: number;
    youtubeSubscribers?: number;
    twitterFollowers?: number;
  }
) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const channel = await db.query.distributionChannels.findFirst({
      where: eq(distributionChannels.id, channelId),
    });

    if (!channel) {
      return { error: 'Channel not found' };
    }

    const tiktokFollowers = metrics.tiktokFollowers ?? channel.tiktokFollowers ?? 0;
    const instagramFollowers = metrics.instagramFollowers ?? channel.instagramFollowers ?? 0;
    const youtubeSubscribers = metrics.youtubeSubscribers ?? channel.youtubeSubscribers ?? 0;
    const twitterFollowers = metrics.twitterFollowers ?? channel.twitterFollowers ?? 0;

    const totalFollowers = tiktokFollowers + instagramFollowers + youtubeSubscribers + twitterFollowers;

    await db
      .update(distributionChannels)
      .set({
        tiktokFollowers,
        instagramFollowers,
        youtubeSubscribers,
        twitterFollowers,
        totalFollowers,
        updatedAt: new Date(),
      })
      .where(eq(distributionChannels.id, channelId));

    revalidatePath('/admin/channels');
    return { success: true };
  } catch (error) {
    console.error('Error updating channel metrics:', error);
    return { error: 'Failed to update channel metrics' };
  }
}
