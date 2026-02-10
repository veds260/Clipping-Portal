'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { clipperProfiles, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function updateClipperTier(clipperId: string, tier: 'tier1' | 'tier2' | 'tier3') {
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

export async function updateClipperEmail(clipperId: string, newEmail: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const clipper = await db.query.clipperProfiles.findFirst({
      where: eq(clipperProfiles.id, clipperId),
    });
    if (!clipper) return { error: 'Clipper not found' };

    await db
      .update(users)
      .set({ email: newEmail, updatedAt: new Date() })
      .where(eq(users.id, clipper.userId));

    revalidatePath('/admin/clippers');
    return { success: true };
  } catch (error) {
    console.error('Error updating email:', error);
    return { error: 'Failed to update email' };
  }
}

export async function updateClipperPassword(clipperId: string, newPassword: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const clipper = await db.query.clipperProfiles.findFirst({
      where: eq(clipperProfiles.id, clipperId),
    });
    if (!clipper) return { error: 'Clipper not found' };

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, clipper.userId));

    revalidatePath('/admin/clippers');
    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    return { error: 'Failed to update password' };
  }
}

export async function deleteClipper(clipperId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const clipper = await db.query.clipperProfiles.findFirst({
      where: eq(clipperProfiles.id, clipperId),
    });
    if (!clipper) return { error: 'Clipper not found' };

    // Delete user (cascades to clipper profile)
    await db.delete(users).where(eq(users.id, clipper.userId));

    revalidatePath('/admin/clippers');
    return { success: true };
  } catch (error) {
    console.error('Error deleting clipper:', error);
    return { error: 'Failed to delete clipper' };
  }
}
