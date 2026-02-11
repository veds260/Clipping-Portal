import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

// Cache for 30 seconds
export const revalidate = 30;

import { clipperProfiles, campaigns } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { ClippersTable } from './clippers-table';
import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, Clock, UserX } from 'lucide-react';

async function getClippers() {
  const allClippers = await db.query.clipperProfiles.findMany({
    orderBy: [desc(clipperProfiles.createdAt)],
    with: {
      user: true,
    },
  });

  return allClippers;
}

async function getCampaigns() {
  const allCampaigns = await db.query.campaigns.findMany({
    orderBy: [desc(campaigns.createdAt)],
  });

  return allCampaigns.map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
  }));
}

export default async function AdminClippersPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const [clippers, campaignsList] = await Promise.all([
    getClippers(),
    getCampaigns(),
  ]);

  const activeCount = clippers.filter(c => c.status === 'active').length;
  const pendingCount = clippers.filter(c => c.status === 'pending').length;
  const suspendedCount = clippers.filter(c => c.status === 'suspended').length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Clippers</h1>
        <p className="text-muted-foreground">
          Manage clippers, change tiers, and view performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clippers.length}</p>
                <p className="text-xs text-muted-foreground">Total Clippers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <UserX className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{suspendedCount}</p>
                <p className="text-xs text-muted-foreground">Suspended</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ClippersTable clippers={clippers} campaigns={campaignsList} />
    </div>
  );
}
