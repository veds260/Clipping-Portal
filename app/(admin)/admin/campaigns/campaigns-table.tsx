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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { MoreHorizontal, Edit, Trash2, Eye, Film, Play, Pause, Check } from 'lucide-react';
import { updateCampaignStatus, deleteCampaign } from '@/lib/actions/campaigns';
import Link from 'next/link';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  sourceContentType: string | null;
  startDate: Date | null;
  endDate: Date | null;
  budgetCap: string | null;
  payRatePer1k: string | null;
  status: string | null;
  tierRequirement: string | null;
  createdAt: Date | null;
  clientId: string | null;
  clientName: string | null;
  clientBrandName: string | null;
  clipsCount: number;
  totalViews: number;
  totalPayout: number;
}

interface CampaignsTableProps {
  campaigns: Campaign[];
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
};

const tierColors: Record<string, string> = {
  entry: 'bg-gray-100 text-gray-800',
  approved: 'bg-blue-100 text-blue-800',
  core: 'bg-purple-100 text-purple-800',
};

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const filteredCampaigns = filter === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === filter);

  const handleStatusChange = async (campaignId: string, status: 'draft' | 'active' | 'paused' | 'completed') => {
    setIsLoading(true);
    const result = await updateCampaignStatus(campaignId, status);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Campaign status updated');
    }
  };

  const handleDelete = async (campaignId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setIsLoading(true);
    const result = await deleteCampaign(campaignId);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Campaign deleted');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (value: string | number | null) => {
    const num = typeof value === 'string' ? parseFloat(value || '0') : (value || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['all', 'active', 'draft', 'paused', 'completed'].map((status) => (
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
              <TableHead>Campaign</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Clips</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No campaigns found
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      {campaign.sourceContentType && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {campaign.sourceContentType}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{campaign.clientName || 'No client'}</p>
                      {campaign.clientBrandName && (
                        <p className="text-xs text-muted-foreground">{campaign.clientBrandName}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusColors[campaign.status || 'draft']}
                      variant="outline"
                    >
                      {campaign.status || 'draft'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {campaign.tierRequirement ? (
                      <Badge
                        className={tierColors[campaign.tierRequirement]}
                        variant="outline"
                      >
                        {campaign.tierRequirement}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Any</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      {campaign.budgetCap ? formatCurrency(campaign.budgetCap) : '-'}
                      {campaign.payRatePer1k && (
                        <p className="text-xs text-muted-foreground">
                          ${parseFloat(campaign.payRatePer1k).toFixed(2)}/1K
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Film className="h-4 w-4 text-muted-foreground" />
                      <span>{campaign.clipsCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>{formatNumber(campaign.totalViews)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {campaign.startDate && campaign.endDate ? (
                      <div>
                        <p>{format(new Date(campaign.startDate), 'MMM d')}</p>
                        <p>to {format(new Date(campaign.endDate), 'MMM d')}</p>
                      </div>
                    ) : campaign.startDate ? (
                      <p>From {format(new Date(campaign.startDate), 'MMM d')}</p>
                    ) : (
                      'No dates'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={isLoading}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/admin/campaigns/${campaign.id}`}>
                          <DropdownMenuItem>
                            <Film className="h-4 w-4 mr-2" />
                            View Clips
                          </DropdownMenuItem>
                        </Link>
                        <Link href={`/admin/campaigns/${campaign.id}/edit`}>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Campaign
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        {campaign.status !== 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'active')}>
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'paused')}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        )}
                        {campaign.status !== 'completed' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'completed')}>
                            <Check className="h-4 w-4 mr-2" />
                            Mark Completed
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(campaign.id, campaign.name)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
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
    </div>
  );
}
