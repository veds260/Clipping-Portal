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
import { MoreHorizontal, Eye, Film, DollarSign, TrendingUp } from 'lucide-react';
import { updateClipperTier, updateClipperStatus, updateClipperNotes } from '@/lib/actions/clippers';
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
  user: {
    id: string;
    name: string | null;
    email: string;
    twitterHandle: string | null;
  };
}

interface ClippersTableProps {
  clippers: Clipper[];
}

const tierColors: Record<string, string> = {
  entry: 'bg-gray-100 text-gray-800',
  approved: 'bg-blue-100 text-blue-800',
  core: 'bg-purple-100 text-purple-800',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
};

export function ClippersTable({ clippers }: ClippersTableProps) {
  const [filter, setFilter] = useState<string>('all');
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedClipper, setSelectedClipper] = useState<Clipper | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [notes, setNotes] = useState('');
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
    const result = await updateClipperTier(selectedClipper.id, selectedTier as 'entry' | 'approved' | 'core');
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
    setSelectedTier(clipper.tier || 'entry');
    setTierDialogOpen(true);
  };

  const openNotesDialog = (clipper: Clipper) => {
    setSelectedClipper(clipper);
    setNotes(clipper.notes || '');
    setNotesDialogOpen(true);
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
                    <div>
                      <p className="font-medium">{clipper.user.name || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground">{clipper.user.email}</p>
                      {clipper.user.twitterHandle && (
                        <p className="text-xs text-blue-500">@{clipper.user.twitterHandle}</p>
                      )}
                      {clipper.telegramHandle && (
                        <p className="text-xs text-muted-foreground">TG: {clipper.telegramHandle}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={tierColors[clipper.tier || 'entry']} variant="outline">
                      {clipper.tier || 'entry'}
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
                        <DropdownMenuItem onClick={() => openTierDialog(clipper)}>
                          Change Tier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openNotesDialog(clipper)}>
                          Edit Notes
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
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong>Entry:</strong> New clippers, access to basic campaigns</p>
              <p><strong>Approved:</strong> Proven track record, paid per clip</p>
              <p><strong>Core:</strong> Top performers, priority access + bonuses</p>
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
    </div>
  );
}
