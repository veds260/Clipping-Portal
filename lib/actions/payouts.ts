'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { payoutBatches, clipperPayouts, clips, clipperProfiles, campaigns, campaignClipperAssignments } from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function generatePayoutBatch(periodStart: Date, periodEnd: Date) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    // Get all approved clips in the period that haven't been paid
    const eligibleClips = await db.query.clips.findMany({
      where: and(
        eq(clips.status, 'approved'),
        gte(clips.createdAt, periodStart),
        lte(clips.createdAt, periodEnd)
      ),
      with: {
        clipper: true,
        campaign: true,
      },
    });

    if (eligibleClips.length === 0) {
      return { error: 'No eligible clips found for this period' };
    }

    // Create payout batch
    const [batch] = await db.insert(payoutBatches).values({
      periodStart,
      periodEnd,
      status: 'draft',
    }).returning();

    let totalAmount = 0;
    let totalClips = 0;

    // Group clips by clipper + campaign for per-campaign cap tracking
    const clipsByClipperCampaign = new Map<string, typeof eligibleClips>();
    for (const clip of eligibleClips) {
      if (!clip.clipperId || !clip.campaignId) continue;
      const key = `${clip.clipperId}:${clip.campaignId}`;
      const existing = clipsByClipperCampaign.get(key) || [];
      existing.push(clip);
      clipsByClipperCampaign.set(key, existing);
    }

    // Process each clipper-campaign group
    for (const [key, groupClips] of clipsByClipperCampaign) {
      const [clipperId, campaignId] = key.split(':');

      // Get the clipper's tier for this campaign
      const assignment = await db.query.campaignClipperAssignments.findFirst({
        where: and(
          eq(campaignClipperAssignments.campaignId, campaignId),
          eq(campaignClipperAssignments.clipperId, clipperId),
        ),
      });

      if (!assignment) continue;

      const campaign = groupClips[0]?.campaign;
      if (!campaign) continue;

      const tier = assignment.assignedTier;
      let campaignEarnings = parseFloat(assignment.totalEarnedInCampaign || '0');

      // Get per-campaign cap for this tier
      let maxPerCampaign = Infinity;
      if (tier === 'tier1' && campaign.tier1MaxPerCampaign) {
        maxPerCampaign = parseFloat(campaign.tier1MaxPerCampaign);
      } else if (tier === 'tier2' && campaign.tier2MaxPerCampaign) {
        maxPerCampaign = parseFloat(campaign.tier2MaxPerCampaign);
      } else if (tier === 'tier3' && campaign.tier3MaxPerCampaign) {
        maxPerCampaign = parseFloat(campaign.tier3MaxPerCampaign);
      }

      // Get per-clip cap for this tier
      let maxPerClip = Infinity;
      if (tier === 'tier1' && campaign.tier1MaxPerClip) {
        maxPerClip = parseFloat(campaign.tier1MaxPerClip);
      } else if (tier === 'tier2' && campaign.tier2MaxPerClip) {
        maxPerClip = parseFloat(campaign.tier2MaxPerClip);
      }

      let clipperTotal = 0;
      let clipperViews = 0;
      let paidClipsCount = 0;

      for (const clip of groupClips) {
        const views = clip.views || 0;
        clipperViews += views;

        // Calculate raw earnings based on tier
        let rawEarnings = 0;
        if (tier === 'tier3') {
          // Fixed rate per clip
          rawEarnings = parseFloat(campaign.tier3FixedRate || '0');
        } else {
          // CPM-based
          const cpmRate = tier === 'tier1'
            ? parseFloat(campaign.tier1CpmRate || '0')
            : parseFloat(campaign.tier2CpmRate || '0');
          rawEarnings = Math.floor(views / 1000) * cpmRate;
        }

        // Apply per-clip cap
        let clipEarnings = Math.min(rawEarnings, maxPerClip);

        // Apply per-campaign cap
        const remainingBudget = maxPerCampaign - campaignEarnings;
        if (remainingBudget <= 0) {
          clipEarnings = 0;
        } else {
          clipEarnings = Math.min(clipEarnings, remainingBudget);
        }

        if (clipEarnings > 0) {
          campaignEarnings += clipEarnings;
          clipperTotal += clipEarnings;
          paidClipsCount++;

          // Update clip with payout info
          await db
            .update(clips)
            .set({
              payoutAmount: clipEarnings.toFixed(2),
              payoutBatchId: batch.id,
              status: 'paid',
              updatedAt: new Date(),
            })
            .where(eq(clips.id, clip.id));
        }
      }

      if (clipperTotal > 0) {
        // Create clipper payout record
        await db.insert(clipperPayouts).values({
          batchId: batch.id,
          clipperId,
          campaignId,
          totalViews: clipperViews,
          clipsCount: paidClipsCount,
          amount: clipperTotal.toFixed(2),
          bonusAmount: '0',
          status: 'pending',
        });

        // Update campaign assignment's total earned
        await db
          .update(campaignClipperAssignments)
          .set({ totalEarnedInCampaign: campaignEarnings.toFixed(2) })
          .where(and(
            eq(campaignClipperAssignments.campaignId, campaignId),
            eq(campaignClipperAssignments.clipperId, clipperId),
          ));

        totalAmount += clipperTotal;
        totalClips += paidClipsCount;
      }
    }

    // Update batch totals
    await db
      .update(payoutBatches)
      .set({
        totalAmount: totalAmount.toFixed(2),
        clipsCount: totalClips,
      })
      .where(eq(payoutBatches.id, batch.id));

    revalidatePath('/admin/payouts');
    return { success: true, batchId: batch.id, totalAmount, totalClips };
  } catch (error) {
    console.error('Error generating payout batch:', error);
    return { error: 'Failed to generate payout batch' };
  }
}

export async function markPayoutAsPaid(payoutId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const payout = await db.query.clipperPayouts.findFirst({
      where: eq(clipperPayouts.id, payoutId),
    });

    if (!payout) {
      return { error: 'Payout not found' };
    }

    await db
      .update(clipperPayouts)
      .set({
        status: 'paid',
        paidAt: new Date(),
      })
      .where(eq(clipperPayouts.id, payoutId));

    // Update clipper's total earnings
    if (payout.clipperId) {
      await db
        .update(clipperProfiles)
        .set({
          totalEarnings: sql`total_earnings + ${payout.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(clipperProfiles.id, payout.clipperId));
    }

    revalidatePath('/admin/payouts');
    return { success: true };
  } catch (error) {
    console.error('Error marking payout as paid:', error);
    return { error: 'Failed to mark payout as paid' };
  }
}

export async function deleteBatch(batchId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const batch = await db.query.payoutBatches.findFirst({
      where: eq(payoutBatches.id, batchId),
    });

    if (!batch) {
      return { error: 'Batch not found' };
    }

    if (batch.status !== 'draft') {
      return { error: 'Can only delete draft batches' };
    }

    // Reset clips payout info
    const batchClips = await db.query.clips.findMany({
      where: eq(clips.payoutBatchId, batchId),
    });

    for (const clip of batchClips) {
      await db
        .update(clips)
        .set({
          payoutAmount: null,
          payoutBatchId: null,
          status: 'approved',
          updatedAt: new Date(),
        })
        .where(eq(clips.id, clip.id));
    }

    // Reverse campaign earnings tracking
    const batchPayouts = await db.query.clipperPayouts.findMany({
      where: eq(clipperPayouts.batchId, batchId),
    });

    for (const payout of batchPayouts) {
      if (payout.clipperId && payout.campaignId) {
        const assignment = await db.query.campaignClipperAssignments.findFirst({
          where: and(
            eq(campaignClipperAssignments.campaignId, payout.campaignId),
            eq(campaignClipperAssignments.clipperId, payout.clipperId),
          ),
        });
        if (assignment) {
          const newTotal = Math.max(0, parseFloat(assignment.totalEarnedInCampaign || '0') - parseFloat(payout.amount));
          await db
            .update(campaignClipperAssignments)
            .set({ totalEarnedInCampaign: newTotal.toFixed(2) })
            .where(eq(campaignClipperAssignments.id, assignment.id));
        }
      }
    }

    await db.delete(clipperPayouts).where(eq(clipperPayouts.batchId, batchId));
    await db.delete(payoutBatches).where(eq(payoutBatches.id, batchId));

    revalidatePath('/admin/payouts');
    return { success: true };
  } catch (error) {
    console.error('Error deleting batch:', error);
    return { error: 'Failed to delete batch' };
  }
}

export async function markBatchAsPaid(batchId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const pendingPayouts = await db.query.clipperPayouts.findMany({
      where: and(
        eq(clipperPayouts.batchId, batchId),
        eq(clipperPayouts.status, 'pending')
      ),
    });

    for (const payout of pendingPayouts) {
      await db
        .update(clipperPayouts)
        .set({
          status: 'paid',
          paidAt: new Date(),
        })
        .where(eq(clipperPayouts.id, payout.id));

      if (payout.clipperId) {
        await db
          .update(clipperProfiles)
          .set({
            totalEarnings: sql`total_earnings + ${payout.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(clipperProfiles.id, payout.clipperId));
      }
    }

    await db
      .update(payoutBatches)
      .set({
        status: 'completed',
        processedBy: session.user.id,
        processedAt: new Date(),
      })
      .where(eq(payoutBatches.id, batchId));

    revalidatePath('/admin/payouts');
    revalidatePath('/clipper/earnings');
    return { success: true };
  } catch (error) {
    console.error('Error marking batch as paid:', error);
    return { error: 'Failed to mark batch as paid' };
  }
}
