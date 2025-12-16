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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MoreHorizontal, Check, X, ExternalLink, Eye, ThumbsUp, MessageCircle, Share2, Copy, Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { approveClip, rejectClip, updateClipMetrics, scanForDuplicates } from '@/lib/actions/clips';
import { format } from 'date-fns';

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
  isDuplicate: boolean | null;
  duplicateOfClipId: string | null;
  createdAt: Date | null;
  clipper: {
    id: string;
    user: {
      name: string | null;
      email: string;
    };
  } | null;
}

interface ClipsTableProps {
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

export function ClipsTable({ clips }: ClipsTableProps) {
  const [filter, setFilter] = useState<string>('all');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [metrics, setMetrics] = useState({ views: 0, likes: 0, comments: 0, shares: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const filteredClips = filter === 'all'
    ? clips
    : filter === 'duplicate'
    ? clips.filter(clip => clip.isDuplicate)
    : clips.filter(clip => clip.status === filter);

  const duplicateCount = clips.filter(clip => clip.isDuplicate).length;

  const handleApprove = async (clipId: string) => {
    setIsLoading(true);
    const result = await approveClip(clipId);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Clip approved');
    }
  };

  const handleReject = async () => {
    if (!selectedClip) return;

    setIsLoading(true);
    const result = await rejectClip(selectedClip.id, rejectReason);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Clip rejected');
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedClip(null);
    }
  };

  const handleUpdateMetrics = async () => {
    if (!selectedClip) return;

    setIsLoading(true);
    const result = await updateClipMetrics({
      clipId: selectedClip.id,
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
    });
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Metrics updated');
      setMetricsDialogOpen(false);
      setSelectedClip(null);
    }
  };

  const openRejectDialog = (clip: Clip) => {
    setSelectedClip(clip);
    setRejectDialogOpen(true);
  };

  const openMetricsDialog = (clip: Clip) => {
    setSelectedClip(clip);
    setMetrics({
      views: clip.views || 0,
      likes: clip.likes || 0,
      comments: clip.comments || 0,
      shares: clip.shares || 0,
    });
    setMetricsDialogOpen(true);
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleScanDuplicates = async () => {
    setIsScanning(true);
    const result = await scanForDuplicates();
    setIsScanning(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Scan complete! Found ${result.duplicatesFound} new duplicates.`);
    }
  };

  return (
    <div className="space-y-4">
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
        {duplicateCount > 0 && (
          <Button
            variant={filter === 'duplicate' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('duplicate')}
            className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300"
          >
            <Copy className="h-3 w-3 mr-1" />
            Duplicates ({duplicateCount})
          </Button>
        )}
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleScanDuplicates}
            disabled={isScanning}
          >
            <Search className="h-3 w-3 mr-1" />
            {isScanning ? 'Scanning...' : 'Scan for Duplicates'}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clipper</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Hook</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No clips found
                </TableCell>
              </TableRow>
            ) : (
              filteredClips.map((clip) => (
                <TableRow key={clip.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {clip.clipper?.user.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {clip.clipper?.user.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={platformColors[clip.platform] || ''} variant="outline">
                      {clip.platform.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-sm">{clip.hook || clip.title || 'No hook'}</p>
                    <a
                      href={clip.platformPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"
                    >
                      View post <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatNumber(clip.views)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" /> {formatNumber(clip.likes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> {formatNumber(clip.comments)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" /> {formatNumber(clip.shares)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className={statusColors[clip.status || 'pending'] || ''} variant="outline">
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
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {clip.createdAt ? format(new Date(clip.createdAt), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openMetricsDialog(clip)}>
                          Edit Metrics
                        </DropdownMenuItem>
                        {clip.status === 'pending' && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprove(clip.id)}>
                              <Check className="h-4 w-4 mr-2 text-green-500" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRejectDialog(clip)}>
                              <X className="h-4 w-4 mr-2 text-red-500" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem asChild>
                          <a href={clip.platformPostUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Post
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Clip</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this clip. The clipper will see this feedback.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isLoading || !rejectReason}
            >
              {isLoading ? 'Rejecting...' : 'Reject Clip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metrics Dialog */}
      <Dialog open={metricsDialogOpen} onOpenChange={setMetricsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Metrics</DialogTitle>
            <DialogDescription>
              Update the metrics for this clip manually.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="views">Views</Label>
              <Input
                id="views"
                type="number"
                value={metrics.views}
                onChange={(e) => setMetrics({ ...metrics, views: parseInt(e.target.value) || 0 })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="likes">Likes</Label>
              <Input
                id="likes"
                type="number"
                value={metrics.likes}
                onChange={(e) => setMetrics({ ...metrics, likes: parseInt(e.target.value) || 0 })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="comments">Comments</Label>
              <Input
                id="comments"
                type="number"
                value={metrics.comments}
                onChange={(e) => setMetrics({ ...metrics, comments: parseInt(e.target.value) || 0 })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="shares">Shares</Label>
              <Input
                id="shares"
                type="number"
                value={metrics.shares}
                onChange={(e) => setMetrics({ ...metrics, shares: parseInt(e.target.value) || 0 })}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetricsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMetrics} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Metrics'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
