'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { platformSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const payoutSettingsSchema = z.object({
  minimum_views_for_payout: z.number().min(0),
  bonus_threshold_views: z.number().min(0),
  bonus_multiplier: z.number().min(1),
});

const contentSettingsSchema = z.object({
  minimum_clip_duration: z.number().min(1),
  maximum_clip_duration: z.number().min(1),
  content_guidelines: z.string(),
});

const tierSettingsSchema = z.object({
  tier_approved_min_clips: z.number().min(1),
  tier_core_min_views: z.number().min(0),
  tier_core_min_clips: z.number().min(1),
  tier_approved_min_avg_views: z.number().min(0),
  tier_core_min_avg_views: z.number().min(0),
  entry_benefits: z.string().optional(),
  approved_benefits: z.string().optional(),
  core_benefits: z.string().optional(),
  entry_pay_rate: z.number().min(0).optional(),
  approved_pay_rate: z.number().min(0).optional(),
  core_pay_rate: z.number().min(0).optional(),
});

export async function getSettings(key: string) {
  const setting = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, key),
  });

  return setting?.value || null;
}

export async function updatePayoutSettings(data: z.infer<typeof payoutSettingsSchema>) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = payoutSettingsSchema.parse(data);

    const existing = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, 'payout_settings'),
    });

    if (existing) {
      await db
        .update(platformSettings)
        .set({
          value: validated,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(platformSettings.key, 'payout_settings'));
    } else {
      await db.insert(platformSettings).values({
        key: 'payout_settings',
        value: validated,
        updatedBy: session.user.id,
      });
    }

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating payout settings:', error);
    return { error: 'Failed to update settings' };
  }
}

export async function updateContentSettings(data: z.infer<typeof contentSettingsSchema>) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = contentSettingsSchema.parse(data);

    const existing = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, 'content_settings'),
    });

    if (existing) {
      await db
        .update(platformSettings)
        .set({
          value: validated,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(platformSettings.key, 'content_settings'));
    } else {
      await db.insert(platformSettings).values({
        key: 'content_settings',
        value: validated,
        updatedBy: session.user.id,
      });
    }

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating content settings:', error);
    return { error: 'Failed to update settings' };
  }
}

export async function updateTierSettings(data: z.infer<typeof tierSettingsSchema>) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = tierSettingsSchema.parse(data);

    const existing = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, 'tier_settings'),
    });

    if (existing) {
      await db
        .update(platformSettings)
        .set({
          value: validated,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(platformSettings.key, 'tier_settings'));
    } else {
      await db.insert(platformSettings).values({
        key: 'tier_settings',
        value: validated,
        updatedBy: session.user.id,
      });
    }

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating tier settings:', error);
    return { error: 'Failed to update settings' };
  }
}
