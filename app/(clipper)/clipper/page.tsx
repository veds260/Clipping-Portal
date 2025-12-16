import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

// Cache for 30 seconds
export const revalidate = 30;
import { clipperProfiles, clips, clipperPayouts, platformSettings } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Film, Eye, DollarSign, TrendingUp, Award } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getClipperData(userId: string) {
  const profile = await db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.userId, userId),
  });

  if (!profile) return null;

  // Get recent clips
  const recentClips = await db.query.clips.findMany({
    where: eq(clips.clipperId, profile.id),
    orderBy: [desc(clips.createdAt)],
    limit: 5,
  });

  // Get pending earnings
  const pendingEarningsResult = await db
    .select({ sum: sql<number>`coalesce(sum(amount), 0)` })
    .from(clipperPayouts)
    .where(and(eq(clipperPayouts.clipperId, profile.id), eq(clipperPayouts.status, 'pending')));
  const pendingEarnings = pendingEarningsResult[0]?.sum || 0;

  // Get tier settings for progress calculation
  const tierSettings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'tier_settings'),
  });

  const settings = tierSettings?.value as {
    tier_approved_min_clips: number;
    tier_core_min_views: number;
    tier_core_min_clips: number;
    tier_approved_min_avg_views: number;
    tier_core_min_avg_views: number;
  } || {
    tier_approved_min_clips: 10,
    tier_core_min_views: 500000,
    tier_core_min_clips: 50,
    tier_approved_min_avg_views: 1000,
    tier_core_min_avg_views: 5000,
  };

  return {
    profile,
    recentClips,
    pendingEarnings,
    tierSettings: settings,
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

const tierColors: Record<string, string> = {
  entry: 'bg-gray-100 text-gray-800',
  approved: 'bg-blue-100 text-blue-800',
  core: 'bg-purple-100 text-purple-800',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-blue-100 text-blue-800',
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
          <h1 className="text-2xl font-bold mb-4">Welcome to Compound Clipper!</h1>
          <p className="text-muted-foreground mb-8">
            Your clipper profile is being set up. Please wait for admin approval.
          </p>
        </div>
      </div>
    );
  }

  const { profile, recentClips, pendingEarnings, tierSettings } = data;

  // Calculate tier progress
  let tierProgress = 0;
  let nextTier = '';
  let progressLabel = '';

  if (profile.tier === 'entry') {
    nextTier = 'Approved';
    tierProgress = Math.min(100, ((profile.clipsApproved || 0) / tierSettings.tier_approved_min_clips) * 100);
    progressLabel = `${profile.clipsApproved || 0} / ${tierSettings.tier_approved_min_clips} approved clips`;
  } else if (profile.tier === 'approved') {
    nextTier = 'Core';
    tierProgress = Math.min(100, ((profile.totalViews || 0) / tierSettings.tier_core_min_views) * 100);
    progressLabel = `${formatNumber(profile.totalViews)} / ${formatNumber(tierSettings.tier_core_min_views)} total views`;
  } else {
    nextTier = '';
    tierProgress = 100;
    progressLabel = 'Maximum tier reached!';
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {session.user.name?.split(' ')[0] || 'Clipper'}!</h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your clipping performance
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
              {formatCurrency(profile.totalEarnings)} total earned
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Tier Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Tier Progress
            </CardTitle>
            <CardDescription>
              Your current standing and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Current Tier</span>
                <Badge className={tierColors[profile.tier || 'entry']} variant="outline">
                  {profile.tier || 'entry'}
                </Badge>
              </div>

              {nextTier && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress to {nextTier}</span>
                      <span>{Math.round(tierProgress)}%</span>
                    </div>
                    <Progress value={tierProgress} />
                    <p className="text-xs text-muted-foreground">{progressLabel}</p>
                  </div>
                </>
              )}

              {!nextTier && (
                <p className="text-sm text-muted-foreground">
                  Congratulations! You&apos;ve reached the highest tier.
                </p>
              )}
            </div>
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
                        {clip.hook || clip.title || 'Untitled clip'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(clip.views)} views on {clip.platform.replace('_', ' ')}
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
