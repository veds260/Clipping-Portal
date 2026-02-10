'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { platformSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const payoutSettingsSchema = z.object({
  minimum_views_for_payout: z.number().min(0),
});

const contentSettingsSchema = z.object({
  content_guidelines: z.string(),
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

