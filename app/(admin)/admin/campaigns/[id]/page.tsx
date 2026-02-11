import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { campaigns, clips, clipperProfiles, users, campaignClipperAssignments } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Film, DollarSign, ExternalLink, Edit, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { CampaignDetailClient } from './campaign-detail-client';

export const dynamic = 'force-dynamic';

async function getCampaignData(id: string) {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });

  if (!campaign) return null;

  // Get clips for this campaign
  const campaignClips = await db
    .select({
      id: clips.id,
      platform: clips.platform,
      platformPostUrl: clips.platformPostUrl,
      tweetText: clips.tweetText,
      authorUsername: clips.authorUsername,
      views: clips.views,
      likes: clips.likes,
      comments: clips.comments,
      shares: clips.shares,
      status: clips.status,
      payoutAmount: clips.payoutAmount,
      tagCompliance: clips.tagCompliance,
      postedAt: clips.postedAt,
      createdAt: clips.createdAt,
      clipperId: clips.clipperId,
      clipperName: users.name,
    })
    .from(clips)
    .leftJoin(clipperProfiles, eq(clips.clipperId, clipperProfiles.id))
    .leftJoin(users, eq(clipperProfiles.userId, users.id))
    .where(eq(clips.campaignId, id))
    .orderBy(desc(clips.postedAt));

  // Get assignments for this campaign
  const assignments = await db.query.campaignClipperAssignments.findMany({
    where: eq(campaignClipperAssignments.campaignId, id),
    with: {
      clipper: {
        with: {
          user: true,
        },
      },
    },
  });

  // Get available clippers (active, not already assigned)
  const allActiveClippers = await db.query.clipperProfiles.findMany({
    where: eq(clipperProfiles.status, 'active'),
    with: {
      user: true,
    },
  });

  const assignedClipperIds = new Set(assignments.map(a => a.clipperId));
  const availableClippers = allActiveClippers.filter(c => !assignedClipperIds.has(c.id));

  // Calculate stats
  const totalViews = campaignClips.reduce((sum, clip) => sum + (clip.views || 0), 0);
  const totalPayout = campaignClips.reduce((sum, clip) => sum + parseFloat(clip.payoutAmount || '0'), 0);

  // Calculate per-clipper stats from clips
  const clipperClipCounts = new Map<string, { submitted: number; earnings: number }>();
  for (const clip of campaignClips) {
    if (!clip.clipperId) continue;
    const existing = clipperClipCounts.get(clip.clipperId) || { submitted: 0, earnings: 0 };
    existing.submitted += 1;
    existing.earnings += parseFloat(clip.payoutAmount || '0');
    clipperClipCounts.set(clip.clipperId, existing);
  }

  const assignmentsWithStats = assignments.map(a => ({
    ...a,
    clipsSubmitted: clipperClipCounts.get(a.clipperId)?.submitted || 0,
    earnings: clipperClipCounts.get(a.clipperId)?.earnings || 0,
  }));

  return {
    campaign,
    clips: campaignClips,
    assignments: assignmentsWithStats,
    availableClippers,
    stats: {
      totalClips: campaignClips.length,
      totalViews,
      totalPayout,
    },
  };
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const { id } = await params;
  const data = await getCampaignData(id);

  if (!data) {
    notFound();
  }

  const { campaign, clips: campaignClips, assignments, availableClippers, stats } = data;

  const formatNumber = (num: number | null) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/campaigns">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </Link>
      </div>

      {/* Campaign Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <Badge
              className={statusColors[campaign.status || 'draft']}
              variant="outline"
            >
              {campaign.status || 'draft'}
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-muted-foreground mb-2">{campaign.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {campaign.brandName && (
              <span>
                Brand: <span className="font-medium">{campaign.brandName}</span>
              </span>
            )}
            {campaign.startDate && (
              <span>
                {format(new Date(campaign.startDate), 'MMM d, yyyy')}
                {campaign.endDate && ` - ${format(new Date(campaign.endDate), 'MMM d, yyyy')}`}
              </span>
            )}
          </div>
        </div>
        <Link href={`/admin/campaigns/${id}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Campaign
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clips</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClips}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalViews)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPayout)}</div>
            {campaign.budgetCap && parseFloat(campaign.budgetCap) > 0 && (
              <p className="text-xs text-muted-foreground">
                of {formatCurrency(parseFloat(campaign.budgetCap))} budget
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notion Embed */}
      {campaign.notionUrl && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Campaign Brief</CardTitle>
            <CardDescription>
              <a href={campaign.notionUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                Open in Notion <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden bg-white">
              <iframe
                src={campaign.notionUrl.replace('notion.so', 'notion.site').replace(/\?.*$/, '')}
                className="w-full border-0"
                style={{ height: '600px' }}
                loading="lazy"
                title={`${campaign.name} brief`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <CampaignDetailClient
        campaignId={id}
        assignments={JSON.parse(JSON.stringify(assignments))}
        clips={JSON.parse(JSON.stringify(campaignClips))}
        availableClippers={JSON.parse(JSON.stringify(availableClippers))}
      />
    </div>
  );
}
