'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, clipperProfiles, clips, clipperPayouts, campaigns, campaignClipperAssignments, payoutBatches, activityLog, platformSettings } from '@/lib/db/schema';
import { eq, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

// Get user password (returns masked password for display)
export async function getUserPassword(userId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return { error: 'User not found' };
  }

  return {
    hasPassword: !!user.passwordHash,
    email: user.email,
  };
}

// Update user password
export async function updateUserPassword(userId: string, newPassword: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath('/admin/clippers');
  return { success: true };
}

// Update user email
export async function updateUserEmail(userId: string, newEmail: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  if (!newEmail || !newEmail.includes('@')) {
    return { error: 'Invalid email address' };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, newEmail),
  });

  if (existing && existing.id !== userId) {
    return { error: 'Email already in use' };
  }

  await db.update(users)
    .set({
      email: newEmail,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath('/admin/clippers');
  return { success: true };
}

// Delete clipper and all their data
export async function deleteClipperData(clipperProfileId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const clipper = await db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.id, clipperProfileId),
  });

  if (!clipper) {
    return { error: 'Clipper not found' };
  }

  // Delete in order (due to foreign keys):
  await db.delete(clipperPayouts).where(eq(clipperPayouts.clipperId, clipperProfileId));
  await db.delete(campaignClipperAssignments).where(eq(campaignClipperAssignments.clipperId, clipperProfileId));

  // Update clips to remove clipper reference
  await db.update(clips)
    .set({ clipperId: null })
    .where(eq(clips.clipperId, clipperProfileId));

  await db.delete(clipperProfiles).where(eq(clipperProfiles.id, clipperProfileId));
  await db.delete(users).where(eq(users.id, clipper.userId));

  revalidatePath('/admin/clippers');
  return { success: true };
}

// Delete entire database (dangerous!)
export async function deleteEntireDatabase(confirmationText: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  if (confirmationText !== 'DELETE EVERYTHING') {
    return { error: 'Confirmation text does not match' };
  }

  // Delete in order to respect foreign keys
  await db.delete(activityLog);
  await db.delete(clipperPayouts);
  await db.delete(payoutBatches);
  await db.delete(clips);
  await db.delete(campaignClipperAssignments);
  await db.delete(campaigns);
  await db.delete(clipperProfiles);
  await db.delete(platformSettings);

  // Keep admin user but delete all others
  await db.delete(users).where(ne(users.role, 'admin'));

  // Re-ensure admin user exists with correct credentials
  const { ensureAdminUser } = await import('@/lib/init-admin');
  await ensureAdminUser();

  revalidatePath('/admin');
  return { success: true };
}
