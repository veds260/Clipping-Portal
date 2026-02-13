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
import { MoreHorizontal, Check, X, ExternalLink, Eye, ThumbsUp, MessageCircle, Share2, Copy, CheckCircle, XCircle, MapPin, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { approveClip, rejectClip, toggleClipExcluded } from '@/lib/actions/clips';
import { format } from 'date-fns';

interface Clip {
  id: string;
  platform: string;
  platformPostUrl: string;
  tweetText: string | null;
  authorUsername: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  status: string | null;
  rejectionReason: string | null;
  tagCompliance: { compliant: boolean; found: string[]; missing: string[] } | null;
  commenterDemographics: {
    locations: { location: string; count: number }[];
    totalFetched: number;
    fetchedAt: string;
  } | null;
  excludedFromStats: boolean | null;
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
  campaign: {
    id: string;
    name: string;
    brandName: string | null;
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
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const openRejectDialog = (clip: Clip) => {
    setSelectedClip(clip);
    setRejectDialogOpen(true);
  };

  const handleToggleExcluded = async (clipId: string) => {
    setIsLoading(true);
    const result = await toggleClipExcluded(clipId);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.excluded ? 'Clip excluded from campaign stats' : 'Clip included in campaign stats');
    }
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
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
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clipper</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Tag Compliance</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No clips found
                </TableCell>
              </TableRow>
            ) : (
              filteredClips.map((clip) => (
                <TableRow key={clip.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {clip.clipper?.user.name || clip.authorUsername || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {clip.clipper?.user.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {clip.campaign ? (
                      <div>
                        <p className="text-sm font-medium">{clip.campaign.name}</p>
                        {clip.campaign.brandName && (
                          <p className="text-xs text-muted-foreground">{clip.campaign.brandName}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No campaign</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={platformColors[clip.platform] || ''} variant="outline">
                      {clip.platform.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-sm">{clip.tweetText || 'No content'}</p>
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
                    {clip.tagCompliance ? (
                      clip.tagCompliance.compliant ? (
                        <Badge className="bg-green-100 text-green-800" variant="outline">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Pass
                        </Badge>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="bg-red-100 text-red-800" variant="outline">
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
                    </div>
                  </TableCell>
                  <TableCell>
                    {clip.commenterDemographics && clip.commenterDemographics.locations.length > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="space-y-0.5 max-w-[120px]">
                              {clip.commenterDemographics.locations.slice(0, 3).map((loc, i) => (
                                <div key={i} className="flex items-center gap-1 text-xs">
                                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{loc.location}</span>
                                  <span className="text-muted-foreground ml-auto shrink-0">{loc.count}</span>
                                </div>
                              ))}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[250px]">
                            <p className="font-medium mb-1">Commenter Locations ({clip.commenterDemographics.totalFetched} sampled)</p>
                            {clip.commenterDemographics.locations.slice(0, 10).map((loc, i) => (
                              <p key={i} className="text-xs">{loc.location}: {loc.count}</p>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className={statusColors[clip.status || 'pending'] || ''} variant="outline">
                        {clip.status || 'pending'}
                      </Badge>
                      {clip.excludedFromStats && (
                        <Badge className="bg-orange-100 text-orange-800 border-orange-300" variant="outline">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Excluded
                        </Badge>
                      )}
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
                        {clip.status !== 'approved' && (
                          <DropdownMenuItem onClick={() => handleApprove(clip.id)}>
                            <Check className="h-4 w-4 mr-2 text-green-500" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {clip.status !== 'rejected' && (
                          <DropdownMenuItem onClick={() => openRejectDialog(clip)}>
                            <X className="h-4 w-4 mr-2 text-red-500" />
                            Reject
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleToggleExcluded(clip.id)}>
                          <EyeOff className="h-4 w-4 mr-2 text-orange-500" />
                          {clip.excludedFromStats ? 'Include in Stats' : 'Exclude from Stats'}
                        </DropdownMenuItem>
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
    </div>
  );
}
