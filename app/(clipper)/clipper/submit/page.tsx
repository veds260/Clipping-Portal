import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clipperProfiles, campaignClipperAssignments, clips } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { SubmitClipForm } from './submit-form';

export const dynamic = 'force-dynamic';

async function getClipperData(userId: string) {
  const profile = await db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.userId, userId),
  });
  return profile;
}

async function getAssignedCampaigns(clipperId: string) {
  const assignments = await db.query.campaignClipperAssignments.findMany({
    where: eq(campaignClipperAssignments.clipperId, clipperId),
    with: {
      campaign: true,
    },
  });

  // Only return campaigns that are active
  const activeCampaigns = assignments.filter((a) => a.campaign.status === 'active');

  // Get clip counts for each campaign
  const campaignsWithCounts = await Promise.all(
    activeCampaigns.map(async (a) => {
      const clipCount = await db.query.clips.findMany({
        where: and(
          eq(clips.campaignId, a.campaign.id),
          eq(clips.clipperId, clipperId),
        ),
        columns: { id: true },
      });

      return {
        id: a.campaign.id,
        name: a.campaign.name,
        brandName: a.campaign.brandName,
        assignedTier: a.assignedTier,
        requiredTags: a.campaign.requiredTags as string[] | null,
        maxClipsPerClipper: a.campaign.maxClipsPerClipper || 0,
        submittedClips: clipCount.length,
        tier1CpmRate: a.campaign.tier1CpmRate,
        tier2CpmRate: a.campaign.tier2CpmRate,
        tier3FixedRate: a.campaign.tier3FixedRate,
        notionUrl: a.campaign.notionUrl,
      };
    })
  );

  return campaignsWithCounts;
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

  const campaigns = await getAssignedCampaigns(clipperProfile.id);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Submit New Clip</h1>
        <p className="text-muted-foreground">
          Paste your tweet URL and we&apos;ll fetch the metrics automatically
        </p>
      </div>

      <SubmitClipForm campaigns={campaigns} />
    </div>
  );
}
