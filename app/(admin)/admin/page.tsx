import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

// Cache for 30 seconds - allows fast page loads while still updating frequently
export const revalidate = 30;

import { clips, clipperProfiles, clipperPayouts, campaigns } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Film, Users, DollarSign, Eye, Clock, Megaphone } from 'lucide-react';

async function getStats() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoISO = weekAgo.toISOString();

  const [clipStats, clipperStats, payoutStats, campaignStats] = await Promise.all([
    db.select({
      totalClips: sql<number>`count(*)`,
      clipsThisWeek: sql<number>`count(*) filter (where ${clips.createdAt} >= ${weekAgoISO}::timestamp)`,
      pendingClips: sql<number>`count(*) filter (where ${clips.status} = 'pending')`,
      totalViews: sql<number>`coalesce(sum(${clips.views}), 0)`,
    }).from(clips),

    db.select({
      totalClippers: sql<number>`count(*)`,
      activeClippers: sql<number>`count(*) filter (where ${clipperProfiles.status} = 'active')`,
    }).from(clipperProfiles),

    db.select({
      pendingPayouts: sql<number>`coalesce(sum(${clipperPayouts.amount}) filter (where ${clipperPayouts.status} = 'pending'), 0)`,
      totalPaid: sql<number>`coalesce(sum(${clipperPayouts.amount}) filter (where ${clipperPayouts.status} = 'paid'), 0)`,
    }).from(clipperPayouts),

    db.select({
      activeCampaigns: sql<number>`count(*) filter (where ${campaigns.status} = 'active')`,
      totalCampaigns: sql<number>`count(*)`,
    }).from(campaigns),
  ]);

  return {
    totalClips: clipStats[0]?.totalClips || 0,
    clipsThisWeek: clipStats[0]?.clipsThisWeek || 0,
    pendingClips: clipStats[0]?.pendingClips || 0,
    totalViews: clipStats[0]?.totalViews || 0,
    activeClippers: clipperStats[0]?.activeClippers || 0,
    totalClippers: clipperStats[0]?.totalClippers || 0,
    pendingPayouts: payoutStats[0]?.pendingPayouts || 0,
    totalPaid: payoutStats[0]?.totalPaid || 0,
    activeCampaigns: campaignStats[0]?.activeCampaigns || 0,
    totalCampaigns: campaignStats[0]?.totalCampaigns || 0,
  };
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

export default async function AdminDashboard() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const stats = await getStats();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your clipping community performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clips</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalClips)}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.clipsThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalViews)}</div>
            <p className="text-xs text-muted-foreground">
              Across all clips
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clippers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClippers}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalClippers} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalCampaigns} total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span>Clips pending review</span>
                </div>
                <span className="font-bold">{stats.pendingClips}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span>Pending payouts</span>
                </div>
                <span className="font-bold">{formatCurrency(stats.pendingPayouts)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Avg views per clip</span>
                <span className="font-bold">
                  {stats.totalClips > 0
                    ? formatNumber(Math.round(stats.totalViews / stats.totalClips))
                    : '0'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Clips per clipper</span>
                <span className="font-bold">
                  {stats.totalClippers > 0
                    ? (stats.totalClips / stats.totalClippers).toFixed(1)
                    : '0'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total paid all time</span>
                <span className="font-bold">{formatCurrency(stats.totalPaid)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
