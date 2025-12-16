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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ExternalLink, Eye, Edit2, Copy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { updateClipperMetrics } from '@/lib/actions/clips';
import { format } from 'date-fns';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

interface Clip {
  id: string;
  title: string | null;
  hook: string | null;
  platform: string;
  platformPostUrl: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  status: string | null;
  rejectionReason: string | null;
  payoutAmount: string | null;
  isDuplicate: boolean | null;
  createdAt: Date | null;
}

interface ClipperClipsViewProps {
  clips: Clip[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-blue-100 text-blue-800',
};

const platformColors: Record<string, string> = {
  tiktok: 'bg-pink-100 text-pink-800',
  instagram: 'bg-purple-100 text-purple-800',
  youtube_shorts: 'bg-red-100 text-red-800',
  twitter: 'bg-sky-100 text-sky-800',
};

export function ClipperClipsView({ clips }: ClipperClipsViewProps) {
  const [filter, setFilter] = useState<string>('all');
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [views, setViews] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const filteredClips = filter === 'all'
    ? clips
    : clips.filter(clip => clip.status === filter);

  const handleUpdateViews = async () => {
    if (!selectedClip) return;

    setIsLoading(true);
    const result = await updateClipperMetrics(selectedClip.id, views);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Views updated');
      setUpdateDialogOpen(false);
      setSelectedClip(null);
    }
  };

  const openUpdateDialog = (clip: Clip) => {
    setSelectedClip(clip);
    setViews(clip.views || 0);
    setUpdateDialogOpen(true);
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
  const totalEarnings = clips.reduce((sum, c) => sum + parseFloat(c.payoutAmount || '0'), 0);
  const approvedCount = clips.filter(c => c.status === 'approved' || c.status === 'paid').length;

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
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings.toString())}</div>
            <p className="text-xs text-muted-foreground">Total Earnings</p>
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
              <TableHead>Platform</TableHead>
              <TableHead>Hook/Title</TableHead>
              <TableHead>Views</TableHead>
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
                  <TableCell>
                    <Badge className={platformColors[clip.platform] || ''} variant="outline">
                      {clip.platform.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-sm font-medium">
                      {clip.hook || clip.title || 'No title'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatNumber(clip.views)}</span>
                    </div>
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
                              <Badge className="bg-orange-100 text-orange-800 border-orange-300" variant="outline">
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
                  <TableCell className="font-medium">
                    {clip.payoutAmount ? formatCurrency(clip.payoutAmount) : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {clip.createdAt ? format(new Date(clip.createdAt), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openUpdateDialog(clip)}
                        title="Update views"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
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

      {/* Update Views Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update View Count</DialogTitle>
            <DialogDescription>
              Enter the current view count for your clip. This will be verified by the team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="views">Current Views</Label>
              <Input
                id="views"
                type="number"
                value={views}
                onChange={(e) => setViews(parseInt(e.target.value) || 0)}
                className="mt-2"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              You can check your view count on {selectedClip?.platform.replace('_', ' ')} and enter it here.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateViews} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Views'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
