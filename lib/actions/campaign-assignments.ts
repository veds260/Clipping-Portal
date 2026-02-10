'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { campaignClipperAssignments, clipperProfiles, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function assignClipperToCampaign(
  campaignId: string,
  clipperId: string,
  tier: 'tier1' | 'tier2' | 'tier3'
) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    // Check if assignment already exists
    const existing = await db.query.campaignClipperAssignments.findFirst({
      where: and(
        eq(campaignClipperAssignments.campaignId, campaignId),
        eq(campaignClipperAssignments.clipperId, clipperId),
      ),
    });

    if (existing) {
      return { error: 'Clipper is already assigned to this campaign' };
    }

    await db.insert(campaignClipperAssignments).values({
      campaignId,
      clipperId,
      assignedTier: tier,
    });

    revalidatePath(`/admin/campaigns/${campaignId}`);
    revalidatePath('/admin/campaigns');
    return { success: true };
  } catch (error) {
    console.error('Error assigning clipper:', error);
    return { error: 'Failed to assign clipper to campaign' };
  }
}

export async function removeClipperFromCampaign(campaignId: string, clipperId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db.delete(campaignClipperAssignments)
      .where(and(
        eq(campaignClipperAssignments.campaignId, campaignId),
        eq(campaignClipperAssignments.clipperId, clipperId),
      ));

    revalidatePath(`/admin/campaigns/${campaignId}`);
    revalidatePath('/admin/campaigns');
    return { success: true };
  } catch (error) {
    console.error('Error removing clipper:', error);
    return { error: 'Failed to remove clipper from campaign' };
  }
}

export async function updateClipperCampaignTier(
  campaignId: string,
  clipperId: string,
  newTier: 'tier1' | 'tier2' | 'tier3'
) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db.update(campaignClipperAssignments)
      .set({ assignedTier: newTier })
      .where(and(
        eq(campaignClipperAssignments.campaignId, campaignId),
        eq(campaignClipperAssignments.clipperId, clipperId),
      ));

    revalidatePath(`/admin/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating tier:', error);
    return { error: 'Failed to update clipper tier' };
  }
}

export async function getCampaignAssignments(campaignId: string) {
  return db.query.campaignClipperAssignments.findMany({
    where: eq(campaignClipperAssignments.campaignId, campaignId),
    with: {
      clipper: {
        with: {
          user: true,
        },
      },
    },
  });
}

export async function getClipperCampaigns(clipperId: string) {
  return db.query.campaignClipperAssignments.findMany({
    where: eq(campaignClipperAssignments.clipperId, clipperId),
    with: {
      campaign: true,
    },
  });
}

export async function getAvailableClippers(campaignId: string) {
  // Get all active clippers not already assigned to this campaign
  const allClippers = await db.query.clipperProfiles.findMany({
    where: eq(clipperProfiles.status, 'active'),
    with: {
      user: true,
      campaignAssignments: true,
    },
  });

  return allClippers.filter(
    clipper => !clipper.campaignAssignments.some(a => a.campaignId === campaignId)
  );
}
