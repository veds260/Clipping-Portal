'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Globe, BarChart3, RefreshCw, Users, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LocationCount {
  location: string;
  count: number;
}

interface DemographicsCardProps {
  clipperLocations: LocationCount[];
  totalClippers: number;
  clippersWithLocation: number;
  commenterLocations: LocationCount[];
  totalCommenters: number;
}

export function DemographicsCard({
  clipperLocations,
  totalClippers,
  clippersWithLocation,
  commenterLocations,
  totalCommenters,
}: DemographicsCardProps) {
  const [isFetching, setIsFetching] = useState(false);

  const handleFetchDemographics = async () => {
    setIsFetching(true);
    try {
      const res = await fetch('/api/demographics', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        const clipperCount = data.clippers?.updated || 0;
        const commenterCount = data.commenters?.updated || 0;
        toast.success(
          `Updated ${clipperCount} clipper locations and ${commenterCount} clip commenter demographics`
        );
        // Reload to show new data
        window.location.reload();
      } else {
        toast.error(data.error || 'Failed to fetch demographics');
      }
    } catch {
      toast.error('Failed to fetch demographics');
    } finally {
      setIsFetching(false);
    }
  };

  const coveragePercent = totalClippers > 0
    ? Math.round((clippersWithLocation / totalClippers) * 100)
    : 0;

  const topClipperLocation = clipperLocations[0];
  const topCommenterLocation = commenterLocations[0];

  const maxClipperCount = clipperLocations[0]?.count || 1;
  const maxCommenterCount = commenterLocations[0]?.count || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Location Demographics</h2>
          <p className="text-sm text-muted-foreground">
            Geographic breakdown of clippers and their audience engagement
          </p>
        </div>
        <Button
          onClick={handleFetchDemographics}
          disabled={isFetching}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Fetching...' : 'Fetch Demographics'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <MapPin className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{topClipperLocation?.location || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Top Clipper Location</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Globe className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{clipperLocations.length}</p>
                <p className="text-xs text-muted-foreground">Unique Locations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <BarChart3 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{coveragePercent}%</p>
                <p className="text-xs text-muted-foreground">Location Coverage</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <MessageCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{topCommenterLocation?.location || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Top Commenter Location</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Clipper Locations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clipper Locations
              <Badge variant="outline" className="ml-auto text-xs">
                {clippersWithLocation}/{totalClippers} clippers
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clipperLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No location data yet. Click &quot;Fetch Demographics&quot; to pull from Twitter profiles.
              </p>
            ) : (
              <div className="space-y-3">
                {clipperLocations.slice(0, 10).map((loc) => (
                  <div key={loc.location} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[200px]">{loc.location}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {loc.count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${(loc.count / maxClipperCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commenter Locations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Commenter Locations (Engagement)
              <Badge variant="outline" className="ml-auto text-xs">
                {totalCommenters} commenters
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commenterLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No commenter data yet. Click &quot;Fetch Demographics&quot; to analyze clip replies.
              </p>
            ) : (
              <div className="space-y-3">
                {commenterLocations.slice(0, 10).map((loc) => (
                  <div key={loc.location} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[200px]">{loc.location}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {loc.count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all"
                        style={{ width: `${(loc.count / maxCommenterCount) * 100}%` }}
                      />
                    </div>
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
