import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { distributionChannels } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { ChannelsTable } from './channels-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

async function getChannels() {
  const channels = await db.query.distributionChannels.findMany({
    orderBy: [desc(distributionChannels.totalFollowers)],
  });
  return channels;
}

export default async function AdminChannelsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const channels = await getChannels();

  // Calculate totals
  const totalFollowers = channels.reduce((sum, ch) => sum + (ch.totalFollowers || 0), 0);
  const totalViews = channels.reduce((sum, ch) => sum + (ch.totalViews || 0), 0);
  const activeChannels = channels.filter(ch => ch.status === 'active').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Distribution Channels</h1>
          <p className="text-muted-foreground">
            Manage your owned distribution network across platforms
          </p>
        </div>
        <Link href="/admin/channels/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Channels</p>
          <p className="text-2xl font-bold">{channels.length}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Active Channels</p>
          <p className="text-2xl font-bold text-green-600">{activeChannels}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Followers</p>
          <p className="text-2xl font-bold">{formatNumber(totalFollowers)}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Views</p>
          <p className="text-2xl font-bold">{formatNumber(totalViews)}</p>
        </div>
      </div>

      <ChannelsTable channels={channels} />
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
