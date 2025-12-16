import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clients, clips, campaigns } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Heart, MessageCircle, Share2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

async function getClientClips(userId: string) {
  const client = await db.query.clients.findFirst({
    where: eq(clients.userId, userId),
  });

  if (!client) return null;

  const clientClips = await db
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
      postedAt: clips.postedAt,
      campaignId: clips.campaignId,
      campaignName: campaigns.name,
    })
    .from(clips)
    .leftJoin(campaigns, eq(clips.campaignId, campaigns.id))
    .where(eq(clips.clientId, client.id))
    .orderBy(desc(clips.postedAt));

  return {
    client,
    clips: clientClips,
  };
}

const statusColors: Record<string, string> = {
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

export default async function ClientClipsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const data = await getClientClips(session.user.id);

  if (!data) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Account Not Linked</CardTitle>
            <CardDescription>
              Your account is not linked to a client profile. Please contact support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { clips: clientClips } = data;

  const formatNumber = (num: number | null) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const totalViews = clientClips.reduce((sum, clip) => sum + (clip.views || 0), 0);
  const approvedClips = clientClips.filter(c => c.status === 'approved' || c.status === 'paid');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Your Clips</h1>
        <p className="text-muted-foreground">
          All clips created for your content
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Clips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientClips.length}</div>
            <p className="text-xs text-muted-foreground">
              {approvedClips.length} approved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalViews)}</div>
            <p className="text-xs text-muted-foreground">
              Across all platforms
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Views/Clip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clientClips.length > 0 ? formatNumber(Math.round(totalViews / clientClips.length)) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per clip average
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clips</CardTitle>
          <CardDescription>
            {clientClips.length} total clip{clientClips.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientClips.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No clips yet. Clippers will start creating content for your campaigns soon.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clip</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Metrics</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientClips.map((clip) => (
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
                        {clip.campaignName || 'No campaign'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {platformLabels[clip.platform] || clip.platform}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[clip.status || 'pending']}
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
