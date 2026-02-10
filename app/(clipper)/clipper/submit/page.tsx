import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clipperProfiles, campaignClipperAssignments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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
  return assignments
    .filter((a) => a.campaign.status === 'active')
    .map((a) => ({
      id: a.campaign.id,
      name: a.campaign.name,
      brandName: a.campaign.brandName,
      assignedTier: a.assignedTier,
      requiredTags: a.campaign.requiredTags as string[] | null,
    }));
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
