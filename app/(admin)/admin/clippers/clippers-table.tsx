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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Eye, Film, DollarSign, TrendingUp, Key, Trash2, Mail, Wallet, Megaphone, Plus, Copy } from 'lucide-react';
import { updateClipperTier, updateClipperStatus, updateClipperNotes } from '@/lib/actions/clippers';
import { updateUserPassword, updateUserEmail, deleteClipperData } from '@/lib/actions/admin-users';
import { assignClipperToCampaign } from '@/lib/actions/campaign-assignments';
import { format } from 'date-fns';

interface Clipper {
  id: string;
  tier: string | null;
  telegramHandle: string | null;
  totalViews: number | null;
  totalEarnings: string | null;
  clipsSubmitted: number | null;
  clipsApproved: number | null;
  avgViewsPerClip: number | null;
  status: string | null;
  notes: string | null;
  onboardedAt: Date | null;
  createdAt: Date | null;
  walletAddress: string | null;
  walletType: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    twitterHandle: string | null;
    avatarUrl: string | null;
  };
}

interface CampaignOption {
  id: string;
  name: string;
  status: string | null;
}

interface ClippersTableProps {
  clippers: Clipper[];
  campaigns?: CampaignOption[];
}

const tierColors: Record<string, string> = {
  unassigned: 'bg-gray-100/50 text-gray-500',
  tier1: 'bg-gray-100 text-gray-800',
  tier2: 'bg-blue-100 text-blue-800',
  tier3: 'bg-purple-100 text-purple-800',
};

const tierLabels: Record<string, string> = {
  unassigned: 'No Tier',
  tier1: 'Tier 1',
  tier2: 'Tier 2',
  tier3: 'Tier 3',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
};

export function ClippersTable({ clippers, campaigns = [] }: ClippersTableProps) {
  const [filter, setFilter] = useState<string>('all');
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [selectedClipper, setSelectedClipper] = useState<Clipper | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedCampaignTier, setSelectedCampaignTier] = useState<string>('tier1');
  const [notes, setNotes] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredClippers = filter === 'all'
    ? clippers
    : clippers.filter(c => c.status === filter);

  const handleStatusChange = async (clipperId: string, status: 'active' | 'suspended' | 'pending') => {
    setIsLoading(true);
    const result = await updateClipperStatus(clipperId, status);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Clipper ${status === 'active' ? 'activated' : status === 'suspended' ? 'suspended' : 'set to pending'}`);
    }
  };

  const handleTierChange = async () => {
    if (!selectedClipper || !selectedTier) return;

    setIsLoading(true);
    const result = await updateClipperTier(selectedClipper.id, selectedTier as 'unassigned' | 'tier1' | 'tier2' | 'tier3');
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Tier updated');
      setTierDialogOpen(false);
      setSelectedClipper(null);
      setSelectedTier('');
    }
  };

  const handleNotesUpdate = async () => {
    if (!selectedClipper) return;

    setIsLoading(true);
    const result = await updateClipperNotes(selectedClipper.id, notes);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Notes updated');
      setNotesDialogOpen(false);
      setSelectedClipper(null);
      setNotes('');
    }
  };

  const openTierDialog = (clipper: Clipper) => {
    setSelectedClipper(clipper);
    setSelectedTier(clipper.tier || 'unassigned');
    setTierDialogOpen(true);
  };

  const openNotesDialog = (clipper: Clipper) => {
    setSelectedClipper(clipper);
    setNotes(clipper.notes || '');
    setNotesDialogOpen(true);
  };

  const openPasswordDialog = (clipper: Clipper) => {
    setSelectedClipper(clipper);
    setNewPassword('');
    setPasswordDialogOpen(true);
  };

  const openEmailDialog = (clipper: Clipper) => {
    setSelectedClipper(clipper);
    setNewEmail(clipper.user.email);
    setEmailDialogOpen(true);
  };

  const openDeleteDialog = (clipper: Clipper) => {
    setSelectedClipper(clipper);
    setDeleteConfirmation('');
    setDeleteDialogOpen(true);
  };

  const openCampaignDialog = (clipper: Clipper) => {
    setSelectedClipper(clipper);
    setSelectedCampaignId('');
    setSelectedCampaignTier(clipper.tier && clipper.tier !== 'unassigned' ? clipper.tier : 'tier1');
    setCampaignDialogOpen(true);
  };

  const handleCampaignAssign = async () => {
    if (!selectedClipper || !selectedCampaignId) return;

    setIsLoading(true);
    const result = await assignClipperToCampaign(
      selectedCampaignId,
      selectedClipper.id,
      selectedCampaignTier as 'tier1' | 'tier2' | 'tier3'
    );
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Clipper assigned to campaign');
      setCampaignDialogOpen(false);
      setSelectedClipper(null);
    }
  };

  const handlePasswordChange = async () => {
    if (!selectedClipper || !newPassword) return;

    setIsLoading(true);
    const result = await updateUserPassword(selectedClipper.user.id, newPassword);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Password updated');
      setPasswordDialogOpen(false);
      setSelectedClipper(null);
      setNewPassword('');
    }
  };

  const handleEmailChange = async () => {
    if (!selectedClipper || !newEmail) return;

    setIsLoading(true);
    const result = await updateUserEmail(selectedClipper.user.id, newEmail);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Email updated');
      setEmailDialogOpen(false);
      setSelectedClipper(null);
      setNewEmail('');
    }
  };

  const handleDelete = async () => {
    if (!selectedClipper || deleteConfirmation !== 'DELETE') return;

    setIsLoading(true);
    const result = await deleteClipperData(selectedClipper.id);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Clipper deleted');
      setDeleteDialogOpen(false);
      setSelectedClipper(null);
      setDeleteConfirmation('');
    }
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (num: string | null) => {
    const value = parseFloat(num || '0');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['all', 'active', 'pending', 'suspended'].map((status) => (
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clipper</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Clips</TableHead>
              <TableHead>Total Views</TableHead>
              <TableHead>Avg Views</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClippers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No clippers found
                </TableCell>
              </TableRow>
            ) : (
              filteredClippers.map((clipper) => (
                <TableRow key={clipper.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={clipper.user.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs bg-muted">
                          {clipper.user.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{clipper.user.name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground">{clipper.user.email}</p>
                        {clipper.user.twitterHandle && (
                          <a
                            href={`https://x.com/${clipper.user.twitterHandle.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            @{clipper.user.twitterHandle.replace(/^@/, '')}
                          </a>
                        )}
                        {clipper.telegramHandle && (
                          <a
                            href={`https://t.me/${clipper.telegramHandle.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-500 hover:underline"
                          >
                            TG: @{clipper.telegramHandle.replace(/^@/, '')}
                          </a>
                        )}
                        {clipper.walletAddress && (
                          <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            <span className="text-xs font-medium text-foreground/70">{clipper.walletType || 'EVM'}</span>
                            {clipper.walletAddress.slice(0, 6)}...{clipper.walletAddress.slice(-4)}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(clipper.walletAddress!);
                                toast.success('Wallet address copied');
                              }}
                              className="hover:text-foreground"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={tierColors[clipper.tier || 'unassigned']} variant="outline">
                      {tierLabels[clipper.tier || 'unassigned'] || 'No Tier'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[clipper.status || 'pending']} variant="outline">
                      {clipper.status || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Film className="h-4 w-4 text-muted-foreground" />
                      <span>{clipper.clipsApproved || 0}/{clipper.clipsSubmitted || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatNumber(clipper.totalViews)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span>{formatNumber(clipper.avgViewsPerClip)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatCurrency(clipper.totalEarnings)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {clipper.createdAt ? format(new Date(clipper.createdAt), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openCampaignDialog(clipper)}>
                          <Megaphone className="h-4 w-4 mr-2" />
                          Assign to Campaign
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openTierDialog(clipper)}>
                          Change Tier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openNotesDialog(clipper)}>
                          Edit Notes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEmailDialog(clipper)}>
                          <Mail className="h-4 w-4 mr-2" />
                          Change Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openPasswordDialog(clipper)}>
                          <Key className="h-4 w-4 mr-2" />
                          Change Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {clipper.status !== 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(clipper.id, 'active')}>
                            Activate
                          </DropdownMenuItem>
                        )}
                        {clipper.status !== 'suspended' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(clipper.id, 'suspended')}
                            className="text-red-600"
                          >
                            Suspend
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(clipper)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Clipper
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

      {/* Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Tier</DialogTitle>
            <DialogDescription>
              Update the tier for {selectedClipper?.user.name || 'this clipper'}.
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
                  <SelectItem value="unassigned">No Tier (Unassigned)</SelectItem>
                  <SelectItem value="tier1">Tier 1</SelectItem>
                  <SelectItem value="tier2">Tier 2</SelectItem>
                  <SelectItem value="tier3">Tier 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong>Tier 1:</strong> New clippers, CPM-based pay rate</p>
              <p><strong>Tier 2:</strong> Proven performers, higher CPM rate</p>
              <p><strong>Tier 3:</strong> Top performers, fixed rate per clip</p>
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

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
            <DialogDescription>
              Add internal notes for {selectedClipper?.user.name || 'this clipper'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this clipper..."
                className="mt-2"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleNotesUpdate} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedClipper?.user.name || 'this clipper'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-display">Email</Label>
              <Input
                id="email-display"
                value={selectedClipper?.user.email || ''}
                disabled
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordChange} disabled={isLoading || newPassword.length < 6}>
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              Update the email address for {selectedClipper?.user.name || 'this clipper'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-email">Email Address</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailChange} disabled={isLoading || !newEmail.includes('@')}>
              {isLoading ? 'Updating...' : 'Update Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Clipper</DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedClipper?.user.name || 'this clipper'} and all their data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will delete:
              </p>
              <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                <li>The clipper profile and all stats</li>
                <li>All payout records</li>
                <li>The user account</li>
              </ul>
              <p className="text-sm text-red-800 mt-2">
                Clips will be kept but unassigned from this clipper.
              </p>
            </div>
            <div>
              <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading || deleteConfirmation !== 'DELETE'}
            >
              {isLoading ? 'Deleting...' : 'Delete Clipper'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Assignment Dialog */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Campaign</DialogTitle>
            <DialogDescription>
              Assign {selectedClipper?.user.name || 'this clipper'} to a campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Campaign</Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.filter(c => c.status === 'active').length === 0 ? (
                    <SelectItem value="_none" disabled>No active campaigns</SelectItem>
                  ) : (
                    campaigns.filter(c => c.status === 'active').map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tier for this campaign</Label>
              <Select value={selectedCampaignTier} onValueChange={setSelectedCampaignTier}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier1">Tier 1 (CPM)</SelectItem>
                  <SelectItem value="tier2">Tier 2 (Higher CPM)</SelectItem>
                  <SelectItem value="tier3">Tier 3 (Fixed Rate)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCampaignAssign} disabled={isLoading || !selectedCampaignId}>
              {isLoading ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
