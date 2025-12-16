import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clients, campaigns, clips } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
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
import { Film, Eye } from 'lucide-react';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

async function getClientCampaigns(userId: string) {
  const client = await db.query.clients.findFirst({
    where: eq(clients.userId, userId),
  });

  if (!client) return null;

  const clientCampaigns = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      description: campaigns.description,
      sourceContentType: campaigns.sourceContentType,
      sourceContentUrl: campaigns.sourceContentUrl,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
      budgetCap: campaigns.budgetCap,
      status: campaigns.status,
      createdAt: campaigns.createdAt,
    })
    .from(campaigns)
    .where(eq(campaigns.clientId, client.id))
    .orderBy(campaigns.createdAt);

  // Get clip stats for each campaign
  const campaignStats = await db
    .select({
      campaignId: clips.campaignId,
      clipsCount: sql<number>`count(*)`.as('clips_count'),
      totalViews: sql<number>`coalesce(sum(${clips.views}), 0)`.as('total_views'),
    })
    .from(clips)
    .where(eq(clips.clientId, client.id))
    .groupBy(clips.campaignId);

  const statsMap = new Map(campaignStats.map(s => [s.campaignId, s]));

  return {
    client,
    campaigns: clientCampaigns.map(campaign => ({
      ...campaign,
      clipsCount: statsMap.get(campaign.id)?.clipsCount || 0,
      totalViews: statsMap.get(campaign.id)?.totalViews || 0,
    })),
  };
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
};

export default async function ClientCampaignsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const data = await getClientCampaigns(session.user.id);

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

  const { campaigns: clientCampaigns } = data;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Your Campaigns</h1>
        <p className="text-muted-foreground">
          View all campaigns created for your content
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>
            {clientCampaigns.length} total campaign{clientCampaigns.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientCampaigns.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No campaigns yet. Contact your account manager to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Clips</TableHead>
                  <TableHead>Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        {campaign.sourceContentType && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {campaign.sourceContentType}
                          </p>
                        )}
                        {campaign.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {campaign.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[campaign.status || 'draft']}
                        variant="outline"
                      >
                        {campaign.status || 'draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {campaign.startDate && campaign.endDate ? (
                        <div>
                          <p>{format(new Date(campaign.startDate), 'MMM d, yyyy')}</p>
                          <p className="text-xs">to {format(new Date(campaign.endDate), 'MMM d, yyyy')}</p>
                        </div>
                      ) : campaign.startDate ? (
                        <p>From {format(new Date(campaign.startDate), 'MMM d, yyyy')}</p>
                      ) : (
                        'No dates set'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Film className="h-4 w-4 text-muted-foreground" />
                        <span>{campaign.clipsCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span>{formatNumber(campaign.totalViews)}</span>
                      </div>
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
