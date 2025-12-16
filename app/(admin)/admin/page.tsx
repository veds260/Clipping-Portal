import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { clips, clipperProfiles, clipperPayouts } from '@/lib/db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Film, Users, DollarSign, Eye, Clock, CheckCircle } from 'lucide-react';

async function getStats() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Total clips
  const totalClipsResult = await db.select({ count: sql<number>`count(*)` }).from(clips);
  const totalClips = totalClipsResult[0]?.count || 0;

  // Clips this week
  const weekClipsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(clips)
    .where(gte(clips.createdAt, weekAgo));
  const clipsThisWeek = weekClipsResult[0]?.count || 0;

  // Pending clips
  const pendingClipsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(clips)
    .where(eq(clips.status, 'pending'));
  const pendingClips = pendingClipsResult[0]?.count || 0;

  // Total views
  const totalViewsResult = await db
    .select({ sum: sql<number>`coalesce(sum(views), 0)` })
    .from(clips);
  const totalViews = totalViewsResult[0]?.sum || 0;

  // Active clippers
  const activeClippersResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(clipperProfiles)
    .where(eq(clipperProfiles.status, 'active'));
  const activeClippers = activeClippersResult[0]?.count || 0;

  // Total clippers
  const totalClippersResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(clipperProfiles);
  const totalClippers = totalClippersResult[0]?.count || 0;

  // Pending payouts
  const pendingPayoutsResult = await db
    .select({ sum: sql<number>`coalesce(sum(amount), 0)` })
    .from(clipperPayouts)
    .where(eq(clipperPayouts.status, 'pending'));
  const pendingPayouts = pendingPayoutsResult[0]?.sum || 0;

  // Total paid
  const totalPaidResult = await db
    .select({ sum: sql<number>`coalesce(sum(amount), 0)` })
    .from(clipperPayouts)
    .where(eq(clipperPayouts.status, 'paid'));
  const totalPaid = totalPaidResult[0]?.sum || 0;

  return {
    totalClips,
    clipsThisWeek,
    pendingClips,
    totalViews,
    activeClippers,
    totalClippers,
    pendingPayouts,
    totalPaid,
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
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingPayouts)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalPaid)} paid all time
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
