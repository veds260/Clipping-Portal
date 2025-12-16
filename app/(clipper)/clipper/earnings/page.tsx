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
import { DollarSign, Clock, CheckCircle, Film } from 'lucide-react';
import { format } from 'date-fns';

async function getEarningsData(userId: string) {
  const profile = await db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.userId, userId),
  });

  if (!profile) return null;

  // Get all payouts
  const payouts = await db.query.clipperPayouts.findMany({
    where: eq(clipperPayouts.clipperId, profile.id),
    orderBy: [desc(clipperPayouts.createdAt)],
    with: {
      batch: true,
    },
  });

  // Get clips with earnings
  const paidClips = await db.query.clips.findMany({
    where: and(
      eq(clips.clipperId, profile.id),
      eq(clips.status, 'paid')
    ),
    orderBy: [desc(clips.updatedAt)],
  });

  // Calculate totals
  const pendingTotal = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const paidTotal = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return {
    profile,
    payouts,
    paidClips,
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

function formatNumber(num: number | null): string {
  if (num === null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
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

  const { profile, payouts, paidClips, pendingTotal, paidTotal } = data;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Earnings</h1>
        <p className="text-muted-foreground">
          Track your earnings and payout history
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
            <CardTitle className="text-sm font-medium">Paid Clips</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidClips.length}</div>
            <p className="text-xs text-muted-foreground">
              Clips with earnings
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
                      <TableCell>{payout.clipsCount || 0}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payout.amount)}
                        {parseFloat(payout.bonusAmount || '0') > 0 && (
                          <span className="text-xs text-green-600 ml-1">
                            (+{formatCurrency(payout.bonusAmount)} bonus)
                          </span>
                        )}
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

        {/* Clip Earnings Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Clip Earnings</CardTitle>
            <CardDescription>
              Individual clip payouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paidClips.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No paid clips yet. Earnings are calculated when clips are approved and reach the minimum views threshold.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clip</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidClips.slice(0, 10).map((clip) => (
                    <TableRow key={clip.id}>
                      <TableCell>
                        <p className="text-sm font-medium truncate max-w-[150px]">
                          {clip.hook || clip.title || 'Untitled'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {clip.platform.replace('_', ' ')}
                        </p>
                      </TableCell>
                      <TableCell>{formatNumber(clip.views)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(clip.payoutAmount)}
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
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ul className="space-y-2 text-muted-foreground">
            <li>Clips must reach the minimum views threshold (typically 1,000 views) to qualify for payment</li>
            <li>Payouts are calculated based on views x rate (e.g., $1.50 per 1,000 views)</li>
            <li>Viral clips (100k+ views) may receive bonus multipliers</li>
            <li>Payout batches are generated weekly by admins</li>
            <li>Payments are made via Telegram (not through this platform)</li>
            <li>Update your view counts regularly to ensure accurate payouts</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
