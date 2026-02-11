import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

// Cache for 30 seconds
export const revalidate = 30;

import { clipperProfiles, clipperPayouts, clips } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
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
import { DollarSign, Clock, CheckCircle, Film, Upload, Eye, TrendingUp, Wallet } from 'lucide-react';
import { format } from 'date-fns';

async function getEarningsData(userId: string) {
  const profile = await db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.userId, userId),
  });

  if (!profile) return null;

  // Get all payouts with campaign info
  const payouts = await db.query.clipperPayouts.findMany({
    where: eq(clipperPayouts.clipperId, profile.id),
    orderBy: [desc(clipperPayouts.createdAt)],
    with: {
      batch: true,
      campaign: true,
    },
  });

  // Get approved/paid clips grouped by campaign
  const approvedClips = await db.query.clips.findMany({
    where: and(
      eq(clips.clipperId, profile.id),
    ),
    orderBy: [desc(clips.updatedAt)],
    with: {
      campaign: true,
    },
  });

  // Group earnings by campaign
  const campaignEarnings = new Map<string, {
    campaignName: string;
    clipCount: number;
    approvedCount: number;
    paidAmount: number;
    approvedAmount: number;
  }>();

  for (const clip of approvedClips) {
    const key = clip.campaignId || 'uncategorized';
    const existing = campaignEarnings.get(key) || {
      campaignName: clip.campaign?.name || 'Uncategorized',
      clipCount: 0,
      approvedCount: 0,
      paidAmount: 0,
      approvedAmount: 0,
    };

    existing.clipCount++;

    if (clip.status === 'approved' || clip.status === 'paid') {
      existing.approvedCount++;
    }

    if (clip.status === 'paid' && clip.payoutAmount) {
      existing.paidAmount += parseFloat(clip.payoutAmount);
    }

    if (clip.status === 'approved' && clip.payoutAmount) {
      existing.approvedAmount += parseFloat(clip.payoutAmount);
    }

    campaignEarnings.set(key, existing);
  }

  // Calculate totals (only approved/paid amounts)
  const pendingTotal = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const paidTotal = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return {
    profile,
    payouts,
    campaignEarnings: Array.from(campaignEarnings.values()),
    pendingTotal,
    paidTotal,
  };
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
  paid: 'bg-green-900/30 text-green-400 border-green-700',
};

export default async function ClipperEarningsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const data = await getEarningsData(session.user.id);

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Earnings</h1>
          <p className="text-muted-foreground">
            Your clipper profile is being set up. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  const { profile, payouts, campaignEarnings, pendingTotal, paidTotal } = data;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Earnings</h1>
        <p className="text-muted-foreground">
          Track your approved earnings and payout history
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingTotal)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(paidTotal)}</div>
            <p className="text-xs text-muted-foreground">
              All time earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(profile.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              Paid + Pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignEarnings.length}</div>
            <p className="text-xs text-muted-foreground">
              With clip submissions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Payout History */}
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>
              Your payout batches and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No payouts yet. Keep submitting great clips!
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Clips</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="text-sm">
                        {payout.batch ? (
                          <>
                            {format(new Date(payout.batch.periodStart), 'MMM d')} -{' '}
                            {format(new Date(payout.batch.periodEnd), 'MMM d')}
                          </>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {payout.campaign?.name || 'N/A'}
                      </TableCell>
                      <TableCell>{payout.clipsCount || 0}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payout.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[payout.status || 'pending']} variant="outline">
                          {payout.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Earnings by Campaign */}
        <Card>
          <CardHeader>
            <CardTitle>Earnings by Campaign</CardTitle>
            <CardDescription>
              Breakdown per campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaignEarnings.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No clip submissions yet. Start submitting to see earnings here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Clips</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignEarnings.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <p className="text-sm font-medium truncate max-w-[150px]">
                          {entry.campaignName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.approvedCount} approved
                        </p>
                      </TableCell>
                      <TableCell>{entry.clipCount}</TableCell>
                      <TableCell className="font-medium text-green-400">
                        {entry.paidAmount > 0 ? formatCurrency(entry.paidAmount) : '--'}
                      </TableCell>
                      <TableCell className="font-medium text-yellow-400">
                        {entry.approvedAmount > 0 ? formatCurrency(entry.approvedAmount) : '--'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How Payouts Work */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How Payouts Work</CardTitle>
          <CardDescription>From clip submission to wallet payout</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">1</div>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-medium mb-1">Submit Clips</h4>
              <p className="text-xs text-muted-foreground">Post your clip on Twitter with the required tags and submit the link here.</p>
            </div>

            <div className="relative p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">2</div>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-medium mb-1">Earn Views</h4>
              <p className="text-xs text-muted-foreground">Your clip's views are tracked in real-time. More views means higher earnings.</p>
            </div>

            <div className="relative p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">3</div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-medium mb-1">Admin Review</h4>
              <p className="text-xs text-muted-foreground">Admins review your clips periodically and generate payout batches for approved work.</p>
            </div>

            <div className="relative p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">4</div>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-medium mb-1">Get Paid</h4>
              <p className="text-xs text-muted-foreground">Payouts are sent to the wallet address on your profile. Keep it up to date.</p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground text-center">
              Consistent quality and strong performance lead to better rates over time. Keep clipping!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
