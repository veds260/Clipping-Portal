import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { clipperProfiles, campaigns, clips } from '@/lib/db/schema';
import { desc, isNotNull, sql } from 'drizzle-orm';
import { ClippersTable } from './clippers-table';
import { DemographicsCard } from './demographics-card';
import { normalizeLocationCounts } from '@/lib/location-normalizer';
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

async function getDemographicsData(allClippers: Awaited<ReturnType<typeof getClippers>>) {
  // Aggregate clipper locations
  const locationCounts = new Map<string, number>();
  let clippersWithLocation = 0;

  for (const clipper of allClippers) {
    if (clipper.location) {
      clippersWithLocation++;
      locationCounts.set(clipper.location, (locationCounts.get(clipper.location) || 0) + 1);
    }
  }

  const clipperLocations = Array.from(locationCounts.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count);

  // Aggregate commenter demographics across all clips
  const allClipsWithDemographics = await db
    .select({ commenterDemographics: clips.commenterDemographics })
    .from(clips)
    .where(isNotNull(clips.commenterDemographics));

  const commenterCounts = new Map<string, number>();
  let totalCommenters = 0;

  for (const clip of allClipsWithDemographics) {
    const demo = clip.commenterDemographics as {
      locations: { location: string; count: number }[];
      totalFetched: number;
    } | null;
    if (!demo) continue;

    totalCommenters += demo.totalFetched;
    // Normalize commenter locations to real countries
    const normalizedLocs = normalizeLocationCounts(demo.locations);
    for (const loc of normalizedLocs) {
      commenterCounts.set(loc.location, (commenterCounts.get(loc.location) || 0) + loc.count);
    }
  }

  const commenterLocations = Array.from(commenterCounts.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count);

  return {
    clipperLocations,
    clippersWithLocation,
    commenterLocations,
    totalCommenters,
  };
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

  const demographics = await getDemographicsData(clippers);

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

      {/* Location Demographics */}
      <div className="mb-6">
        <DemographicsCard
          clipperLocations={demographics.clipperLocations}
          totalClippers={clippers.length}
          clippersWithLocation={demographics.clippersWithLocation}
          commenterLocations={demographics.commenterLocations}
          totalCommenters={demographics.totalCommenters}
        />
      </div>

      <ClippersTable clippers={clippers} campaigns={campaignsList} />
    </div>
  );
}
