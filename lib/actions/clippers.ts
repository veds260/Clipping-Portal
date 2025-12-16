'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { clipperProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateClipperTier(clipperId: string, tier: 'entry' | 'approved' | 'core') {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db
      .update(clipperProfiles)
      .set({
        tier,
        updatedAt: new Date(),
      })
      .where(eq(clipperProfiles.id, clipperId));

    revalidatePath('/admin/clippers');
    return { success: true };
  } catch (error) {
    console.error('Error updating clipper tier:', error);
    return { error: 'Failed to update tier' };
  }
}

export async function updateClipperStatus(clipperId: string, status: 'active' | 'suspended' | 'pending') {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const updates: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    // Set onboarded_at when activating for the first time
    if (status === 'active') {
      const clipper = await db.query.clipperProfiles.findFirst({
        where: eq(clipperProfiles.id, clipperId),
      });

      if (clipper && !clipper.onboardedAt) {
        updates.onboardedAt = new Date();
      }
    }

    await db
      .update(clipperProfiles)
      .set(updates)
      .where(eq(clipperProfiles.id, clipperId));

    revalidatePath('/admin/clippers');
    return { success: true };
  } catch (error) {
    console.error('Error updating clipper status:', error);
    return { error: 'Failed to update status' };
  }
}

export async function updateClipperNotes(clipperId: string, notes: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db
      .update(clipperProfiles)
      .set({
        notes,
        updatedAt: new Date(),
      })
      .where(eq(clipperProfiles.id, clipperId));

    revalidatePath('/admin/clippers');
    return { success: true };
  } catch (error) {
    console.error('Error updating clipper notes:', error);
    return { error: 'Failed to update notes' };
  }
}
