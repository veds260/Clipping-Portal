import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { campaigns, clients, clips } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Plus, Megaphone, Eye, Film, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { CampaignsTable } from './campaigns-table';

// Cache for 30 seconds
export const revalidate = 30;

async function getCampaigns() {
  const campaignsData = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      description: campaigns.description,
      sourceContentType: campaigns.sourceContentType,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
      budgetCap: campaigns.budgetCap,
      payRatePer1k: campaigns.payRatePer1k,
      status: campaigns.status,
      tierRequirement: campaigns.tierRequirement,
      createdAt: campaigns.createdAt,
      clientId: campaigns.clientId,
      clientName: clients.name,
      clientBrandName: clients.brandName,
    })
    .from(campaigns)
    .leftJoin(clients, eq(campaigns.clientId, clients.id))
    .orderBy(campaigns.createdAt);

  // Get clip stats for each campaign
  const campaignStats = await db
    .select({
      campaignId: clips.campaignId,
      clipsCount: sql<number>`count(*)`.as('clips_count'),
      totalViews: sql<number>`coalesce(sum(${clips.views}), 0)`.as('total_views'),
      totalPayout: sql<number>`coalesce(sum(cast(${clips.payoutAmount} as decimal)), 0)`.as('total_payout'),
    })
    .from(clips)
    .groupBy(clips.campaignId);

  const statsMap = new Map(campaignStats.map(s => [s.campaignId, s]));

  return campaignsData.map(campaign => ({
    ...campaign,
    clipsCount: statsMap.get(campaign.id)?.clipsCount || 0,
    totalViews: statsMap.get(campaign.id)?.totalViews || 0,
    totalPayout: statsMap.get(campaign.id)?.totalPayout || 0,
  }));
}

async function getCampaignStats() {
  const allCampaigns = await db.select().from(campaigns);
  const active = allCampaigns.filter(c => c.status === 'active').length;
  const draft = allCampaigns.filter(c => c.status === 'draft').length;
  const paused = allCampaigns.filter(c => c.status === 'paused').length;
  const completed = allCampaigns.filter(c => c.status === 'completed').length;

  return { total: allCampaigns.length, active, draft, paused, completed };
}

export default async function CampaignsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const [campaignsData, stats] = await Promise.all([
    getCampaigns(),
    getCampaignStats(),
  ]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage client campaigns and track performance
          </p>
        </div>
        <Link href="/admin/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.total}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">Active</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.active}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-400" />
            <span className="text-sm text-muted-foreground">Draft</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.draft}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-sm text-muted-foreground">Paused</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.paused}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-sm text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.completed}</p>
        </div>
      </div>

      <CampaignsTable campaigns={campaignsData} />
    </div>
  );
}
