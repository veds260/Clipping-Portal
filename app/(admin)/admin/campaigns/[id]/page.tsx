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
      <div className="grid gap-4 md:grid-cols-3 mb-4">
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

      {/* Tier Rates */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Badge className="bg-gray-100 text-gray-800" variant="outline">Tier 1</Badge>
          <span className="text-sm font-medium">
            ${parseFloat(campaign.tier1CpmRate || '0').toFixed(2)} per 1K views
          </span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Badge className="bg-blue-100 text-blue-800" variant="outline">Tier 2</Badge>
          <span className="text-sm font-medium">
            ${parseFloat(campaign.tier2CpmRate || '0').toFixed(2)} per 1K views
          </span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Badge className="bg-purple-100 text-purple-800" variant="outline">Tier 3</Badge>
          <span className="text-sm font-medium">
            ${parseFloat(campaign.tier3FixedRate || '0').toFixed(2)} per clip
          </span>
        </div>
      </div>

      {/* Notion Link */}
      {campaign.notionUrl && (
        <a
          href={campaign.notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 mb-8 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.79 2.46c-.466-.373-.84-.186-1.399.046L4.645 3.602c-.466.093-.56.28-.28.466l.094.14zm.793 1.679v13.87c0 .746.373 1.026 1.213.98l14.523-.84c.84-.046.933-.56.933-1.166V4.954c0-.606-.233-.933-.746-.886l-15.177.886c-.56.047-.746.327-.746.933zm14.337.746c.093.42 0 .84-.42.886l-.7.14v10.264c-.607.327-1.166.514-1.633.514-.746 0-.933-.234-1.493-.934l-4.577-7.186v6.952l1.446.327s0 .84-1.166.84l-3.22.187c-.093-.187 0-.654.327-.747l.84-.22V8.781l-1.166-.093c-.093-.42.14-1.026.793-1.073l3.453-.234 4.763 7.28V8.36l-1.213-.14c-.093-.514.28-.886.746-.933l3.22-.187z"/></svg>
          </div>
          <div className="flex-1">
            <p className="font-medium">Campaign Brief</p>
            <p className="text-sm text-muted-foreground">View full brief on Notion</p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </a>
      )}

      {/* Tabs */}
      <CampaignDetailClient
        campaignId={id}
        assignments={JSON.parse(JSON.stringify(assignments))}
        clips={JSON.parse(JSON.stringify(campaignClips))}
        availableClippers={JSON.parse(JSON.stringify(availableClippers))}
        campaignRates={{
          tier1CpmRate: campaign.tier1CpmRate,
          tier2CpmRate: campaign.tier2CpmRate,
          tier3FixedRate: campaign.tier3FixedRate,
        }}
      />
    </div>
  );
}
