'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ExternalLink, Eye, Heart, Repeat2, Copy, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { refreshClipMetrics } from '@/lib/actions/clips';
import { format } from 'date-fns';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

interface TagCompliance {
  compliant: boolean;
  found: string[];
  missing: string[];
}

interface Clip {
  id: string;
  platform: string;
  platformPostUrl: string;
  campaignName: string | null;
  views: number | null;
  likes: number | null;
  retweets: number | null;
  comments: number | null;
  status: string | null;
  rejectionReason: string | null;
  payoutAmount: string | null;
  isDuplicate: boolean | null;
  tagCompliance: TagCompliance | null;
  createdAt: Date | null;
}

interface ClipperClipsViewProps {
  clips: Clip[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
  approved: 'bg-green-900/30 text-green-400 border-green-700',
  rejected: 'bg-red-900/30 text-red-400 border-red-700',
  paid: 'bg-blue-900/30 text-blue-400 border-blue-700',
};

export function ClipperClipsView({ clips }: ClipperClipsViewProps) {
  const [filter, setFilter] = useState<string>('all');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const filteredClips = filter === 'all'
    ? clips
    : clips.filter(clip => clip.status === filter);

  const handleRefreshMetrics = async (clipId: string) => {
    setRefreshingId(clipId);
    const result = await refreshClipMetrics(clipId);
    setRefreshingId(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Metrics refreshed: ${formatNumber(result.views || 0)} views`);
    }
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (amount: string | null) => {
    const value = parseFloat(amount || '0');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Calculate summary stats
  const totalViews = clips.reduce((sum, c) => sum + (c.views || 0), 0);
  const approvedCount = clips.filter(c => c.status === 'approved' || c.status === 'paid').length;
  const paidTotal = clips.filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.payoutAmount || '0'), 0);

  // Earnings display for a clip
  const getEarningsDisplay = (clip: Clip) => {
    if (clip.status === 'paid' && clip.payoutAmount) {
      return <span className="text-blue-400">Paid: {formatCurrency(clip.payoutAmount)}</span>;
    }
    if (clip.status === 'approved' && clip.payoutAmount) {
      return <span className="text-green-400">~{formatCurrency(clip.payoutAmount)}</span>;
    }
    // Pending or rejected clips don't show dollar amounts
    return <span className="text-muted-foreground">--</span>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{clips.length}</div>
            <p className="text-xs text-muted-foreground">Total Clips</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatNumber(totalViews)}</div>
            <p className="text-xs text-muted-foreground">Total Views</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(paidTotal.toString())}</div>
            <p className="text-xs text-muted-foreground">Total Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected', 'paid'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
        <Link href="/clipper/submit">
          <Button>Submit New Clip</Button>
        </Link>
      </div>

      {/* Clips Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Metrics</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No clips found
                </TableCell>
              </TableRow>
            ) : (
              filteredClips.map((clip) => (
                <TableRow key={clip.id}>
                  <TableCell className="max-w-[160px]">
                    <p className="truncate text-sm font-medium">
                      {clip.campaignName || 'No campaign'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-sm">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{formatNumber(clip.views)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Views</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{formatNumber(clip.likes)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Likes</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <Repeat2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{formatNumber(clip.retweets)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Retweets</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>
                    {clip.tagCompliance ? (
                      clip.tagCompliance.compliant ? (
                        <Badge className="bg-green-900/30 text-green-400 border-green-700" variant="outline">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Pass
                        </Badge>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="bg-red-900/30 text-red-400 border-red-700" variant="outline">
                                <XCircle className="h-3 w-3 mr-1" />
                                Fail
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Missing: {clip.tagCompliance.missing.join(', ')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge className={statusColors[clip.status || 'pending']} variant="outline">
                        {clip.status || 'pending'}
                      </Badge>
                      {clip.isDuplicate && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="bg-orange-900/30 text-orange-400 border-orange-700" variant="outline">
                                <Copy className="h-3 w-3 mr-1" />
                                Duplicate
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>This URL was already submitted by another clipper</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {clip.status === 'rejected' && clip.rejectionReason && (
                        <p className="text-xs text-red-500">{clip.rejectionReason}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {getEarningsDisplay(clip)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {clip.createdAt ? format(new Date(clip.createdAt), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefreshMetrics(clip.id)}
                              disabled={refreshingId === clip.id}
                              title="Refresh metrics"
                            >
                              <RefreshCw className={`h-4 w-4 ${refreshingId === clip.id ? 'animate-spin' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Refresh metrics</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <a
                        href={clip.platformPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm" title="View post">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
