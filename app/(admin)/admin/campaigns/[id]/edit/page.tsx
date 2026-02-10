import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { campaigns } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { CampaignForm } from '../../campaign-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getCampaign(id: string) {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });
  return campaign;
}

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const { id } = await params;
  const campaign = await getCampaign(id);

  if (!campaign) {
    notFound();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/admin/campaigns/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Campaign</h1>
        <p className="text-muted-foreground">
          Update {campaign.name}
        </p>
      </div>

      <CampaignForm campaign={{
        ...campaign,
        requiredTags: (campaign.requiredTags as string[]) || [],
      }} />
    </div>
  );
}
