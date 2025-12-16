'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { campaigns } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const campaignSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sourceContentUrl: z.string().optional(),
  sourceContentType: z.enum(['podcast', 'interview', 'livestream', 'other']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  budgetCap: z.number().optional(),
  payRatePer1k: z.number().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  tierRequirement: z.enum(['entry', 'approved', 'core']).optional(),
});

export async function createCampaign(data: z.infer<typeof campaignSchema>) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = campaignSchema.parse(data);

    const [campaign] = await db.insert(campaigns).values({
      clientId: validated.clientId,
      name: validated.name,
      description: validated.description,
      sourceContentUrl: validated.sourceContentUrl,
      sourceContentType: validated.sourceContentType,
      startDate: validated.startDate,
      endDate: validated.endDate,
      budgetCap: validated.budgetCap?.toString(),
      payRatePer1k: validated.payRatePer1k?.toString(),
      status: validated.status || 'draft',
      tierRequirement: validated.tierRequirement,
    }).returning();

    revalidatePath('/admin/campaigns');
    return { success: true, campaignId: campaign.id };
  } catch (error) {
    console.error('Error creating campaign:', error);
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Failed to create campaign' };
  }
}

export async function updateCampaign(campaignId: string, data: z.infer<typeof campaignSchema>) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = campaignSchema.parse(data);

    await db
      .update(campaigns)
      .set({
        clientId: validated.clientId,
        name: validated.name,
        description: validated.description,
        sourceContentUrl: validated.sourceContentUrl,
        sourceContentType: validated.sourceContentType,
        startDate: validated.startDate,
        endDate: validated.endDate,
        budgetCap: validated.budgetCap?.toString(),
        payRatePer1k: validated.payRatePer1k?.toString(),
        status: validated.status,
        tierRequirement: validated.tierRequirement,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    revalidatePath('/admin/campaigns');
    return { success: true };
  } catch (error) {
    console.error('Error updating campaign:', error);
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Failed to update campaign' };
  }
}

export async function updateCampaignStatus(campaignId: string, status: 'draft' | 'active' | 'paused' | 'completed') {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db
      .update(campaigns)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    revalidatePath('/admin/campaigns');
    return { success: true };
  } catch (error) {
    console.error('Error updating campaign status:', error);
    return { error: 'Failed to update campaign status' };
  }
}

export async function deleteCampaign(campaignId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db.delete(campaigns).where(eq(campaigns.id, campaignId));

    revalidatePath('/admin/campaigns');
    return { success: true };
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return { error: 'Failed to delete campaign' };
  }
}
