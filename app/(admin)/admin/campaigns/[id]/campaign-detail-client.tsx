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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Eye, ExternalLink, UserPlus, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react';
import { assignClipperToCampaign, removeClipperFromCampaign, updateClipperCampaignTier } from '@/lib/actions/campaign-assignments';
import { format } from 'date-fns';

interface Assignment {
  id: string;
  campaignId: string;
  clipperId: string;
  assignedTier: string;
  totalEarnedInCampaign: string | null;
  createdAt: string | null;
  clipsSubmitted: number;
  earnings: number;
  clipper: {
    id: string;
    tier: string | null;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
}

interface CampaignClip {
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
  payoutAmount: string | null;
  tagCompliance: { compliant: boolean; found: string[]; missing: string[] } | null;
  postedAt: string | null;
  createdAt: string | null;
  clipperId: string | null;
  clipperName: string | null;
}

interface AvailableClipper {
  id: string;
  tier: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface CampaignRates {
  tier1CpmRate: string | null;
  tier2CpmRate: string | null;
  tier3FixedRate: string | null;
}

interface CampaignDetailClientProps {
  campaignId: string;
  assignments: Assignment[];
  clips: CampaignClip[];
  availableClippers: AvailableClipper[];
  campaignRates: CampaignRates;
}

const tierColors: Record<string, string> = {
  tier1: 'bg-gray-100 text-gray-800',
  tier2: 'bg-blue-100 text-blue-800',
  tier3: 'bg-purple-100 text-purple-800',
};

const tierLabels: Record<string, string> = {
  tier1: 'Tier 1',
  tier2: 'Tier 2',
  tier3: 'Tier 3',
};

const clipStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-blue-100 text-blue-800',
};

function getRateLabel(tier: string, rates: CampaignRates): string {
  if (tier === 'tier3') return `$${parseFloat(rates.tier3FixedRate || '0').toFixed(2)}/clip`;
  if (tier === 'tier2') return `$${parseFloat(rates.tier2CpmRate || '0').toFixed(2)}/1K views`;
  return `$${parseFloat(rates.tier1CpmRate || '0').toFixed(2)}/1K views`;
}

export function CampaignDetailClient({
  campaignId,
  assignments,
  clips,
  availableClippers,
  campaignRates,
}: CampaignDetailClientProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('tier1');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignTier, setAssignTier] = useState<'tier1' | 'tier2' | 'tier3'>('tier1');
  const [isLoading, setIsLoading] = useState(false);

  const filteredAvailable = availableClippers.filter(c =>
    (c.user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignClipper = async (clipperId: string) => {
    setIsLoading(true);
    const result = await assignClipperToCampaign(campaignId, clipperId, assignTier);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Clipper assigned to campaign');
      setAssignDialogOpen(false);
    }
  };

  const handleRemoveClipper = async (clipperId: string) => {
    if (!confirm('Remove this clipper from the campaign?')) return;

    setIsLoading(true);
    const result = await removeClipperFromCampaign(campaignId, clipperId);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Clipper removed from campaign');
    }
  };

  const openTierDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSelectedTier(assignment.assignedTier);
    setTierDialogOpen(true);
  };

  const handleTierChange = async () => {
    if (!selectedAssignment) return;

    setIsLoading(true);
    const result = await updateClipperCampaignTier(
      campaignId,
      selectedAssignment.clipperId,
      selectedTier as 'tier1' | 'tier2' | 'tier3'
    );
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Tier updated');
      setTierDialogOpen(false);
    }
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (value: number | string | null) => {
    const num = typeof value === 'string' ? parseFloat(value || '0') : (value || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <>
      <Tabs defaultValue="clippers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clippers">Assigned Clippers ({assignments.length})</TabsTrigger>
          <TabsTrigger value="clips">Clips ({clips.length})</TabsTrigger>
        </TabsList>

        {/* Assigned Clippers Tab */}
        <TabsContent value="clippers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Assigned Clippers</CardTitle>
                <CardDescription>
                  {assignments.length} clipper{assignments.length !== 1 ? 's' : ''} assigned to this campaign
                </CardDescription>
              </div>
              <Button onClick={() => setAssignDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Clipper
              </Button>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No clippers assigned yet. Click &quot;Assign Clipper&quot; to add clippers to this campaign.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clipper</TableHead>
                      <TableHead>Campaign Tier</TableHead>
                      <TableHead>Clips Submitted</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {assignment.clipper?.user?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {assignment.clipper?.user?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={tierColors[assignment.assignedTier] || ''}
                              variant="outline"
                            >
                              {tierLabels[assignment.assignedTier] || assignment.assignedTier}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {getRateLabel(assignment.assignedTier, campaignRates)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{assignment.clipsSubmitted}</TableCell>
                        <TableCell>{formatCurrency(assignment.earnings)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openTierDialog(assignment)}>
                                Change Tier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRemoveClipper(assignment.clipperId)}
                                className="text-red-600"
                              >
                                Remove from Campaign
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clips Tab */}
        <TabsContent value="clips">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Clips</CardTitle>
              <CardDescription>
                {clips.length} clip{clips.length !== 1 ? 's' : ''} submitted for this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clips.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No clips have been submitted for this campaign yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clipper</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Tag Compliance</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payout</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clips.map((clip) => (
                      <TableRow key={clip.id}>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {clip.clipperName || clip.authorUsername || 'Unknown'}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm truncate">
                            {clip.tweetText || 'No content'}
                          </p>
                        </TableCell>
                        <TableCell>
                          {clip.tagCompliance ? (
                            clip.tagCompliance.compliant ? (
                              <Badge className="bg-green-100 text-green-800" variant="outline">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Compliant
                              </Badge>
                            ) : (
                              <div>
                                <Badge className="bg-red-100 text-red-800" variant="outline">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Non-compliant
                                </Badge>
                                {clip.tagCompliance.missing.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Missing: {clip.tagCompliance.missing.join(', ')}
                                  </p>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span>{formatNumber(clip.views)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={clipStatusColors[clip.status || 'pending']}
                            variant="outline"
                          >
                            {clip.status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {clip.payoutAmount ? formatCurrency(clip.payoutAmount) : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {clip.postedAt ? format(new Date(clip.postedAt), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {clip.platformPostUrl && (
                            <a href={clip.platformPostUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Clipper Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Clipper</DialogTitle>
            <DialogDescription>
              Search for and assign a clipper to this campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Search Clippers</Label>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="mt-2"
              />
            </div>

            <div>
              <Label>Assign at Tier</Label>
              <Select value={assignTier} onValueChange={(v) => setAssignTier(v as 'tier1' | 'tier2' | 'tier3')}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier1">Tier 1 (CPM)</SelectItem>
                  <SelectItem value="tier2">Tier 2 (CPM)</SelectItem>
                  <SelectItem value="tier3">Tier 3 (Fixed)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-md">
              {filteredAvailable.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  No available clippers found
                </p>
              ) : (
                filteredAvailable.map((clipper) => (
                  <div
                    key={clipper.id}
                    className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{clipper.user.name || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground">{clipper.user.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAssignClipper(clipper.id)}
                      disabled={isLoading}
                    >
                      Assign
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Campaign Tier</DialogTitle>
            <DialogDescription>
              Update the tier for {selectedAssignment?.clipper?.user?.name || 'this clipper'} in this campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tier</Label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier1">Tier 1 (CPM-based)</SelectItem>
                  <SelectItem value="tier2">Tier 2 (CPM-based)</SelectItem>
                  <SelectItem value="tier3">Tier 3 (Fixed rate)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTierChange} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
