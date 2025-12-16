'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, clipperProfiles, clips, clipperPayouts, clients, campaigns } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
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

  // Return that password exists but not the actual hash
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
  revalidatePath('/admin/clients');
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

  // Check if email already exists
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
  revalidatePath('/admin/clients');
  return { success: true };
}

// Delete clipper and all their data
export async function deleteClipperData(clipperProfileId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  // Get the clipper profile to find user ID
  const clipper = await db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.id, clipperProfileId),
  });

  if (!clipper) {
    return { error: 'Clipper not found' };
  }

  // Delete in order (due to foreign keys):
  // 1. Delete clipper payouts
  await db.delete(clipperPayouts).where(eq(clipperPayouts.clipperId, clipperProfileId));

  // 2. Update clips to remove clipper reference (don't delete clips as they belong to campaigns)
  await db.update(clips)
    .set({ clipperId: null })
    .where(eq(clips.clipperId, clipperProfileId));

  // 3. Delete clipper profile
  await db.delete(clipperProfiles).where(eq(clipperProfiles.id, clipperProfileId));

  // 4. Delete user account
  await db.delete(users).where(eq(users.id, clipper.userId));

  revalidatePath('/admin/clippers');
  return { success: true };
}

// Delete client and all their data
export async function deleteClientData(clientId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });

  if (!client) {
    return { error: 'Client not found' };
  }

  // Delete in order:
  // 1. Delete clips associated with this client
  await db.delete(clips).where(eq(clips.clientId, clientId));

  // 2. Delete campaigns
  await db.delete(campaigns).where(eq(campaigns.clientId, clientId));

  // 3. Delete client
  await db.delete(clients).where(eq(clients.id, clientId));

  // 4. Delete user account if exists
  if (client.userId) {
    await db.delete(users).where(eq(users.id, client.userId));
  }

  revalidatePath('/admin/clients');
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

  // Delete all tables in order (respecting foreign keys)
  await db.execute(sql`TRUNCATE TABLE activity_log CASCADE`);
  await db.execute(sql`TRUNCATE TABLE clipper_payouts CASCADE`);
  await db.execute(sql`TRUNCATE TABLE payout_batches CASCADE`);
  await db.execute(sql`TRUNCATE TABLE clips CASCADE`);
  await db.execute(sql`TRUNCATE TABLE campaigns CASCADE`);
  await db.execute(sql`TRUNCATE TABLE distribution_channels CASCADE`);
  await db.execute(sql`TRUNCATE TABLE clients CASCADE`);
  await db.execute(sql`TRUNCATE TABLE clipper_profiles CASCADE`);
  await db.execute(sql`TRUNCATE TABLE platform_settings CASCADE`);
  // Keep admin user but delete all others
  await db.execute(sql`DELETE FROM users WHERE role != 'admin'`);

  revalidatePath('/admin');
  return { success: true };
}
