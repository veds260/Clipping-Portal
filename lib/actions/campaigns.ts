'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { campaigns } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const campaignSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  brandName: z.string().optional(),
  brandLogoUrl: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  budgetCap: z.number().min(0).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  contentGuidelines: z.string().nullable().optional(),
  notionUrl: z.string().nullable().optional(),

  // Tier rates
  tier1CpmRate: z.number().min(0).default(0),
  tier2CpmRate: z.number().min(0).default(0),
  tier3FixedRate: z.number().min(0).default(0),

  // Anti-gaming caps
  tier1MaxPerClip: z.number().min(0).optional(),
  tier2MaxPerClip: z.number().min(0).optional(),
  tier1MaxPerCampaign: z.number().min(0).optional(),
  tier2MaxPerCampaign: z.number().min(0).optional(),
  tier3MaxPerCampaign: z.number().min(0).optional(),

  // Clip limit
  maxClipsPerClipper: z.number().min(0).default(0),

  // Tag patterns
  requiredTags: z.array(z.string()).optional(),
});

export type CampaignFormData = z.infer<typeof campaignSchema>;

export async function createCampaign(data: CampaignFormData) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = campaignSchema.parse(data);

    const [campaign] = await db.insert(campaigns).values({
      name: validated.name,
      description: validated.description,
      brandName: validated.brandName,
      brandLogoUrl: validated.brandLogoUrl,
      startDate: validated.startDate,
      endDate: validated.endDate,
      budgetCap: validated.budgetCap?.toString(),
      status: validated.status || 'draft',
      contentGuidelines: validated.contentGuidelines,
      notionUrl: validated.notionUrl,
      tier1CpmRate: validated.tier1CpmRate.toString(),
      tier2CpmRate: validated.tier2CpmRate.toString(),
      tier3FixedRate: validated.tier3FixedRate.toString(),
      tier1MaxPerClip: validated.tier1MaxPerClip?.toString(),
      tier2MaxPerClip: validated.tier2MaxPerClip?.toString(),
      tier1MaxPerCampaign: validated.tier1MaxPerCampaign?.toString(),
      tier2MaxPerCampaign: validated.tier2MaxPerCampaign?.toString(),
      tier3MaxPerCampaign: validated.tier3MaxPerCampaign?.toString(),
      maxClipsPerClipper: validated.maxClipsPerClipper || 0,
      requiredTags: validated.requiredTags || [],
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

export async function updateCampaign(campaignId: string, data: CampaignFormData) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const validated = campaignSchema.parse(data);

    await db
      .update(campaigns)
      .set({
        name: validated.name,
        description: validated.description,
        brandName: validated.brandName,
        brandLogoUrl: validated.brandLogoUrl,
        startDate: validated.startDate,
        endDate: validated.endDate,
        budgetCap: validated.budgetCap?.toString(),
        status: validated.status,
        contentGuidelines: validated.contentGuidelines || null,
        notionUrl: validated.notionUrl || null,
        tier1CpmRate: validated.tier1CpmRate.toString(),
        tier2CpmRate: validated.tier2CpmRate.toString(),
        tier3FixedRate: validated.tier3FixedRate.toString(),
        tier1MaxPerClip: validated.tier1MaxPerClip?.toString(),
        tier2MaxPerClip: validated.tier2MaxPerClip?.toString(),
        tier1MaxPerCampaign: validated.tier1MaxPerCampaign?.toString(),
        tier2MaxPerCampaign: validated.tier2MaxPerCampaign?.toString(),
        tier3MaxPerCampaign: validated.tier3MaxPerCampaign?.toString(),
        maxClipsPerClipper: validated.maxClipsPerClipper || 0,
        requiredTags: validated.requiredTags || [],
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    revalidatePath('/admin/campaigns');
    revalidatePath(`/admin/campaigns/${campaignId}`);
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
