import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { clients, campaigns, clips, clipperProfiles, users } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Heart, MessageCircle, Film, DollarSign, ExternalLink, Edit, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getCampaignWithClips(id: string) {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });

  if (!campaign) return null;

  // Get client info
  const client = campaign.clientId
    ? await db.query.clients.findFirst({
        where: eq(clients.id, campaign.clientId),
      })
    : null;

  // Get clips for this campaign
  const campaignClips = await db
    .select({
      id: clips.id,
      title: clips.title,
      hook: clips.hook,
      platform: clips.platform,
      platformPostUrl: clips.platformPostUrl,
      views: clips.views,
      likes: clips.likes,
      comments: clips.comments,
      shares: clips.shares,
      status: clips.status,
      payoutAmount: clips.payoutAmount,
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

  // Calculate stats
  const totalViews = campaignClips.reduce((sum, clip) => sum + (clip.views || 0), 0);
  const totalLikes = campaignClips.reduce((sum, clip) => sum + (clip.likes || 0), 0);
  const totalPayout = campaignClips.reduce((sum, clip) => sum + parseFloat(clip.payoutAmount || '0'), 0);
  const approvedClips = campaignClips.filter(c => c.status === 'approved' || c.status === 'paid');

  return {
    campaign,
    client,
    clips: campaignClips,
    stats: {
      totalClips: campaignClips.length,
      approvedClips: approvedClips.length,
      totalViews,
      totalLikes,
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

const clipStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-blue-100 text-blue-800',
};

const platformLabels: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube_shorts: 'YouTube',
  twitter: 'Twitter/X',
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
  const data = await getCampaignWithClips(id);

  if (!data) {
    notFound();
  }

  const { campaign, client, clips: campaignClips, stats } = data;

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
            {client && (
              <span>
                Client: <span className="font-medium">{client.brandName || client.name}</span>
              </span>
            )}
            {campaign.sourceContentType && (
              <span className="capitalize">Type: {campaign.sourceContentType}</span>
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
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clips</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClips}</div>
            <p className="text-xs text-muted-foreground">
              {stats.approvedClips} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalLikes)}</div>
            <p className="text-xs text-muted-foreground">
              Engagement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payout</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPayout)}</div>
            <p className="text-xs text-muted-foreground">
              {campaign.payRatePer1k ? `$${parseFloat(campaign.payRatePer1k).toFixed(2)}/1K views` : 'No rate set'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Clips</CardTitle>
          <CardDescription>
            {campaignClips.length} clip{campaignClips.length !== 1 ? 's' : ''} submitted for this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaignClips.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No clips have been submitted for this campaign yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clip</TableHead>
                  <TableHead>Clipper</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Metrics</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignClips.map((clip) => (
                  <TableRow key={clip.id}>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium truncate">{clip.title || 'Untitled'}</p>
                        {clip.hook && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {clip.hook}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {clip.clipperName || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {platformLabels[clip.platform] || clip.platform}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={clipStatusColors[clip.status || 'pending']}
                        variant="outline"
                      >
                        {clip.status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(clip.views)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {formatNumber(clip.likes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {formatNumber(clip.comments)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {clip.payoutAmount ? formatCurrency(parseFloat(clip.payoutAmount)) : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {clip.postedAt ? format(new Date(clip.postedAt), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {clip.platformPostUrl && (
                        <Link href={clip.platformPostUrl} target="_blank">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
