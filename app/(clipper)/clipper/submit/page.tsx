import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clipperProfiles, distributionChannels, campaigns, clients } from '@/lib/db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { SubmitClipForm } from './submit-form';

export const dynamic = 'force-dynamic';

const tierOrder: Record<string, number> = {
  entry: 1,
  approved: 2,
  core: 3,
};

async function getClipperData(userId: string) {
  const profile = await db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.userId, userId),
  });
  return profile;
}

async function getAvailableChannels(clipperTier: string) {
  const allChannels = await db.query.distributionChannels.findMany({
    where: eq(distributionChannels.status, 'active'),
  });

  // Filter channels based on clipper tier
  const clipperTierLevel = tierOrder[clipperTier] || 1;
  return allChannels.filter(channel => {
    const requiredTierLevel = tierOrder[channel.tierRequired || 'core'] || 3;
    return clipperTierLevel >= requiredTierLevel;
  });
}

async function getActiveCampaigns(clipperTier: string) {
  const allCampaigns = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      clientName: clients.name,
      tierRequirement: campaigns.tierRequirement,
    })
    .from(campaigns)
    .leftJoin(clients, eq(campaigns.clientId, clients.id))
    .where(eq(campaigns.status, 'active'));

  // Filter campaigns based on clipper tier
  const clipperTierLevel = tierOrder[clipperTier] || 1;
  return allCampaigns.filter(campaign => {
    if (!campaign.tierRequirement) return true;
    const requiredTierLevel = tierOrder[campaign.tierRequirement] || 1;
    return clipperTierLevel >= requiredTierLevel;
  });
}

export default async function SubmitClipPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const clipperProfile = await getClipperData(session.user.id);

  if (!clipperProfile) {
    redirect('/clipper');
  }

  const clipperTier = clipperProfile.tier || 'entry';

  const [channels, activeCampaigns] = await Promise.all([
    getAvailableChannels(clipperTier),
    getActiveCampaigns(clipperTier),
  ]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Submit New Clip</h1>
        <p className="text-muted-foreground">
          Share your latest clip for review
        </p>
      </div>

      <SubmitClipForm
        channels={channels}
        campaigns={activeCampaigns}
        clipperTier={clipperTier}
      />
    </div>
  );
}
