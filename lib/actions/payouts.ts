'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { payoutBatches, clipperPayouts, clips, clipperProfiles, platformSettings, campaigns } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

interface PayoutSettingsValue {
  minimum_views_for_payout: number;
  bonus_threshold_views: number;
  bonus_multiplier: number;
}

interface TierSettingsValue {
  entry_pay_rate: number;
  approved_pay_rate: number;
  core_pay_rate: number;
}

async function getPayoutSettings(): Promise<PayoutSettingsValue> {
  const settings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'payout_settings'),
  });

  return (settings?.value as PayoutSettingsValue) || {
    minimum_views_for_payout: 1000,
    bonus_threshold_views: 100000,
    bonus_multiplier: 1.5,
  };
}

async function getTierSettings(): Promise<TierSettingsValue> {
  const settings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'tier_settings'),
  });

  return (settings?.value as TierSettingsValue) || {
    entry_pay_rate: 1.0,
    approved_pay_rate: 1.5,
    core_pay_rate: 2.0,
  };
}

function getPayRateForTier(tier: string | null, tierSettings: TierSettingsValue): number {
  switch (tier) {
    case 'core':
      return tierSettings.core_pay_rate || 2.0;
    case 'approved':
      return tierSettings.approved_pay_rate || 1.5;
    default:
      return tierSettings.entry_pay_rate || 1.0;
  }
}

export async function generatePayoutBatch(periodStart: Date, periodEnd: Date) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const payoutSettings = await getPayoutSettings();
    const tierSettings = await getTierSettings();

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

    // Group clips by clipper
    const clipsByClipper = new Map<string, typeof eligibleClips>();
    for (const clip of eligibleClips) {
      if (!clip.clipperId) continue;
      const existing = clipsByClipper.get(clip.clipperId) || [];
      existing.push(clip);
      clipsByClipper.set(clip.clipperId, existing);
    }

    // Create payout batch
    const [batch] = await db.insert(payoutBatches).values({
      periodStart,
      periodEnd,
      status: 'draft',
    }).returning();

    let totalAmount = 0;
    let totalClips = 0;

    // Create individual clipper payouts
    for (const [clipperId, clipperClips] of clipsByClipper) {
      let clipperTotal = 0;
      let clipperBonus = 0;
      let clipperViews = 0;

      // Get clipper's tier to determine pay rate
      const clipperTier = clipperClips[0]?.clipper?.tier || 'entry';
      const payRate = getPayRateForTier(clipperTier, tierSettings);

      for (const clip of clipperClips) {
        const views = clip.views || 0;
        clipperViews += views;

        // Skip if below minimum
        if (views < payoutSettings.minimum_views_for_payout) continue;

        // Determine pay rate: use campaign-specific rate if set (non-zero), otherwise tier rate
        const campaignRate = clip.campaign?.payRatePer1k ? parseFloat(clip.campaign.payRatePer1k) : 0;
        const effectiveRate = campaignRate > 0 ? campaignRate : payRate;

        // Calculate base payout using the effective rate (only count complete thousands)
        const paidThousands = Math.floor(views / 1000);
        let payout = paidThousands * effectiveRate;

        // Apply viral bonus
        if (views >= payoutSettings.bonus_threshold_views) {
          const bonus = payout * (payoutSettings.bonus_multiplier - 1);
          clipperBonus += bonus;
          payout += bonus;
        }

        clipperTotal += payout;

        // Update clip with payout info
        await db
          .update(clips)
          .set({
            payoutAmount: payout.toFixed(2),
            payoutBatchId: batch.id,
            status: 'paid',
            updatedAt: new Date(),
          })
          .where(eq(clips.id, clip.id));
      }

      if (clipperTotal > 0) {
        await db.insert(clipperPayouts).values({
          batchId: batch.id,
          clipperId,
          totalViews: clipperViews,
          clipsCount: clipperClips.length,
          amount: clipperTotal.toFixed(2),
          bonusAmount: clipperBonus.toFixed(2),
          status: 'pending',
        });

        totalAmount += clipperTotal;
        totalClips += clipperClips.length;
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
    // Get the batch
    const batch = await db.query.payoutBatches.findFirst({
      where: eq(payoutBatches.id, batchId),
    });

    if (!batch) {
      return { error: 'Batch not found' };
    }

    // Only allow deleting draft batches
    if (batch.status !== 'draft') {
      return { error: 'Can only delete draft batches' };
    }

    // Get all clips in this batch and reset their payout info
    const batchClips = await db.query.clips.findMany({
      where: eq(clips.payoutBatchId, batchId),
    });

    for (const clip of batchClips) {
      await db
        .update(clips)
        .set({
          payoutAmount: null,
          payoutBatchId: null,
          status: 'approved', // Reset back to approved
          updatedAt: new Date(),
        })
        .where(eq(clips.id, clip.id));
    }

    // Delete clipper payouts for this batch
    await db.delete(clipperPayouts).where(eq(clipperPayouts.batchId, batchId));

    // Delete the batch
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
    // Get all pending payouts in this batch
    const pendingPayouts = await db.query.clipperPayouts.findMany({
      where: and(
        eq(clipperPayouts.batchId, batchId),
        eq(clipperPayouts.status, 'pending')
      ),
    });

    // Mark all as paid
    for (const payout of pendingPayouts) {
      await db
        .update(clipperPayouts)
        .set({
          status: 'paid',
          paidAt: new Date(),
        })
        .where(eq(clipperPayouts.id, payout.id));

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
    }

    // Update batch status
    await db
      .update(payoutBatches)
      .set({
        status: 'completed',
        processedBy: session.user.id,
        processedAt: new Date(),
      })
      .where(eq(payoutBatches.id, batchId));

    revalidatePath('/admin/payouts');
    return { success: true };
  } catch (error) {
    console.error('Error marking batch as paid:', error);
    return { error: 'Failed to mark batch as paid' };
  }
}
