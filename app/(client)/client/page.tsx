import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clients, campaigns, clips } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Film, Eye, DollarSign, Megaphone } from 'lucide-react';
import { format } from 'date-fns';

// Cache for 30 seconds
export const revalidate = 30;

async function getClientData(userId: string) {
  // Get client record linked to this user
  const client = await db.query.clients.findFirst({
    where: eq(clients.userId, userId),
  });

  if (!client) return null;

  // Get campaigns for this client
  const clientCampaigns = await db.query.campaigns.findMany({
    where: eq(campaigns.clientId, client.id),
  });

  // Get clips for this client
  const clientClips = await db
    .select({
      id: clips.id,
      title: clips.title,
      platform: clips.platform,
      views: clips.views,
      status: clips.status,
      postedAt: clips.postedAt,
    })
    .from(clips)
    .where(eq(clips.clientId, client.id))
    .orderBy(clips.postedAt);

  // Calculate stats
  const totalViews = clientClips.reduce((sum, clip) => sum + (clip.views || 0), 0);
  const approvedClips = clientClips.filter(c => c.status === 'approved' || c.status === 'paid');
  const activeCampaigns = clientCampaigns.filter(c => c.status === 'active');

  return {
    client,
    campaigns: clientCampaigns,
    clips: clientClips,
    stats: {
      totalClips: clientClips.length,
      approvedClips: approvedClips.length,
      totalViews,
      activeCampaigns: activeCampaigns.length,
      totalCampaigns: clientCampaigns.length,
    },
  };
}

export default async function ClientDashboard() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const data = await getClientData(session.user.id);

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

  const { client, campaigns: clientCampaigns, clips: clientClips, stats } = data;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome, {client.name}</h1>
        <p className="text-muted-foreground">
          {client.brandName ? `${client.brandName} Dashboard` : 'Client Dashboard'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
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
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCampaigns} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {client.monthlyBudget ? `$${parseFloat(client.monthlyBudget).toLocaleString()}` : 'Unlimited'}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Campaigns</CardTitle>
            <CardDescription>Active and recent campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {clientCampaigns.length === 0 ? (
              <p className="text-muted-foreground text-sm">No campaigns yet</p>
            ) : (
              <div className="space-y-4">
                {clientCampaigns.slice(0, 5).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      {campaign.sourceContentType && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {campaign.sourceContentType}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Clips</CardTitle>
            <CardDescription>Latest clips for your content</CardDescription>
          </CardHeader>
          <CardContent>
            {clientClips.length === 0 ? (
              <p className="text-muted-foreground text-sm">No clips yet</p>
            ) : (
              <div className="space-y-4">
                {clientClips.slice(0, 5).map((clip) => (
                  <div key={clip.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{clip.title || 'Untitled Clip'}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {clip.platform} - {formatNumber(clip.views || 0)} views
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        clip.status === 'approved' || clip.status === 'paid' ? 'bg-green-100 text-green-800' :
                        clip.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {clip.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
