import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

// Cache for 30 seconds
export const revalidate = 30;
import { clipperProfiles, clips, clipperPayouts, campaignClipperAssignments } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Film, Eye, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CampaignAnnouncements } from './campaign-announcements';

async function getClipperData(userId: string) {
  const profile = await db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.userId, userId),
  });

  if (!profile) return null;

  // Get recent clips with campaign info
  const recentClips = await db.query.clips.findMany({
    where: eq(clips.clipperId, profile.id),
    orderBy: [desc(clips.createdAt)],
    limit: 5,
    with: {
      campaign: true,
    },
  });

  // Get campaign assignments with campaign details and clip counts
  const assignments = await db.query.campaignClipperAssignments.findMany({
    where: eq(campaignClipperAssignments.clipperId, profile.id),
    with: {
      campaign: true,
    },
  });

  // For each assignment, get clip count and earned amount
  const campaignData = await Promise.all(
    assignments.map(async (assignment) => {
      const campaignClips = await db.query.clips.findMany({
        where: and(
          eq(clips.clipperId, profile.id),
          eq(clips.campaignId, assignment.campaignId),
        ),
      });

      const approvedClips = campaignClips.filter(
        (c) => c.status === 'approved' || c.status === 'paid'
      );

      const earnedAmount = campaignClips
        .filter((c) => c.status === 'approved' || c.status === 'paid')
        .reduce((sum, c) => sum + parseFloat(c.payoutAmount || '0'), 0);

      return {
        id: assignment.id,
        campaign: assignment.campaign,
        assignedTier: assignment.assignedTier,
        clipCount: campaignClips.length,
        approvedCount: approvedClips.length,
        earnedAmount,
      };
    })
  );

  // Get pending earnings (only from approved payout batches)
  const pendingEarningsResult = await db
    .select({ sum: sql<number>`coalesce(sum(amount), 0)` })
    .from(clipperPayouts)
    .where(and(eq(clipperPayouts.clipperId, profile.id), eq(clipperPayouts.status, 'pending')));
  const pendingEarnings = pendingEarningsResult[0]?.sum || 0;

  // Collect announcements from active campaigns
  const announcements = campaignData
    .filter((item) => item.campaign.status === 'active' && item.campaign.announcement)
    .map((item) => ({
      campaignId: item.campaign.id,
      campaignName: item.campaign.name,
      announcement: item.campaign.announcement!,
    }));

  return {
    profile,
    recentClips,
    pendingEarnings,
    campaignData,
    announcements,
  };
}

function formatNumber(num: number | null): string {
  if (num === null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatCurrency(num: number | string | null): string {
  const value = typeof num === 'string' ? parseFloat(num) : num || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
  approved: 'bg-green-900/30 text-green-400 border-green-700',
  rejected: 'bg-red-900/30 text-red-400 border-red-700',
  paid: 'bg-blue-900/30 text-blue-400 border-blue-700',
};

export default async function ClipperDashboard() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const data = await getClipperData(session.user.id);

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Welcome to Web3 Clipping!</h1>
          <p className="text-muted-foreground mb-8">
            Your clipper profile is being set up. Please wait for admin approval.
          </p>
        </div>
      </div>
    );
  }

  const { profile, recentClips, pendingEarnings, campaignData, announcements } = data;

  return (
    <div className="p-8">
      <CampaignAnnouncements announcements={announcements} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome to Web3 Clipping!</h1>
        <p className="text-muted-foreground">
          Hey {session.user.name?.split(' ')[0] || 'Clipper'}, here&apos;s your clipping overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(profile.totalViews)}</div>
            <p className="text-xs text-muted-foreground">
              Across all clips
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Clips</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.clipsApproved || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {profile.clipsSubmitted || 0} submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Views/Clip</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(profile.avgViewsPerClip)}</div>
            <p className="text-xs text-muted-foreground">
              Performance metric
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              From approved payout batches
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Your Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Your Campaigns</CardTitle>
            <CardDescription>
              Campaigns you are assigned to
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaignData.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-2">No campaign assignments yet</p>
                <p className="text-xs text-muted-foreground">
                  Admins will assign you to campaigns when available.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaignData.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {item.campaign.name}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.clipCount} clips submitted &middot; {item.approvedCount} approved
                      </p>
                    </div>
                    {item.earnedAmount > 0 && (
                      <span className="text-sm font-medium text-green-400">
                        {formatCurrency(item.earnedAmount)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clips */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Clips</CardTitle>
            <CardDescription>
              Your latest submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentClips.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No clips submitted yet</p>
                <Link href="/clipper/submit">
                  <Button>Submit Your First Clip</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentClips.map((clip) => (
                  <div key={clip.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {clip.campaign?.name || 'No campaign'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(clip.views)} views
                      </p>
                    </div>
                    <Badge className={statusColors[clip.status || 'pending']} variant="outline">
                      {clip.status || 'pending'}
                    </Badge>
                  </div>
                ))}
                <Link href="/clipper/clips" className="block">
                  <Button variant="outline" className="w-full">View All Clips</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
