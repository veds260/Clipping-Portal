'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { clients, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  brandName: z.string().optional(),
  twitterHandle: z.string().optional(),
  logoUrl: z.string().optional(),
  monthlyBudget: z.number().optional(),
  payRatePer1k: z.number().optional(),
  contentGuidelines: z.string().optional(),
  isActive: z.boolean().optional(),
  // Login credentials (optional - only for new clients)
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  createLoginAccount: z.boolean().optional(),
});

export async function createClient(data: z.infer<typeof clientSchema>) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = clientSchema.parse(data);

    let userId: string | undefined;

    // Create user account if requested
    if (validated.createLoginAccount && validated.email && validated.password) {
      // Check if email already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, validated.email),
      });

      if (existingUser) {
        return { error: 'Email already in use' };
      }

      const passwordHash = await bcrypt.hash(validated.password, 12);

      const [newUser] = await db.insert(users).values({
        email: validated.email,
        passwordHash,
        name: validated.name,
        role: 'client',
        twitterHandle: validated.twitterHandle,
      }).returning();

      userId = newUser.id;
    }

    const [client] = await db.insert(clients).values({
      userId,
      name: validated.name,
      brandName: validated.brandName,
      twitterHandle: validated.twitterHandle,
      logoUrl: validated.logoUrl,
      monthlyBudget: validated.monthlyBudget?.toString(),
      payRatePer1k: validated.payRatePer1k?.toString(),
      contentGuidelines: validated.contentGuidelines,
      isActive: validated.isActive ?? true,
    }).returning();

    revalidatePath('/admin/clients');
    return { success: true, clientId: client.id };
  } catch (error) {
    console.error('Error creating client:', error);
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Failed to create client' };
  }
}

export async function updateClient(clientId: string, data: z.infer<typeof clientSchema>) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = clientSchema.parse(data);

    await db
      .update(clients)
      .set({
        name: validated.name,
        brandName: validated.brandName,
        twitterHandle: validated.twitterHandle,
        logoUrl: validated.logoUrl,
        monthlyBudget: validated.monthlyBudget?.toString(),
        payRatePer1k: validated.payRatePer1k?.toString(),
        contentGuidelines: validated.contentGuidelines,
        isActive: validated.isActive,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId));

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error) {
    console.error('Error updating client:', error);
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Failed to update client' };
  }
}

export async function toggleClientStatus(clientId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });

    if (!client) {
      return { error: 'Client not found' };
    }

    await db
      .update(clients)
      .set({
        isActive: !client.isActive,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId));

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error) {
    console.error('Error toggling client status:', error);
    return { error: 'Failed to update client status' };
  }
}

export async function deleteClient(clientId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db.delete(clients).where(eq(clients.id, clientId));

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { error: 'Failed to delete client' };
  }
}
