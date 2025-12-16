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
import { MoreHorizontal, Edit, Trash2, ExternalLink } from 'lucide-react';
import { updateChannelStatus, deleteChannel } from '@/lib/actions/channels';
import Link from 'next/link';

interface Channel {
  id: string;
  name: string;
  niche: string;
  description: string | null;
  tiktokHandle: string | null;
  tiktokFollowers: number | null;
  instagramHandle: string | null;
  instagramFollowers: number | null;
  youtubeHandle: string | null;
  youtubeSubscribers: number | null;
  twitterHandle: string | null;
  twitterFollowers: number | null;
  totalFollowers: number | null;
  totalClipsPosted: number | null;
  totalViews: number | null;
  status: string | null;
  tierRequired: string | null;
  allowsFillerContent: boolean | null;
}

interface ChannelsTableProps {
  channels: Channel[];
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  growing: 'bg-blue-100 text-blue-800',
};

const nicheColors: Record<string, string> = {
  crypto: 'bg-orange-100 text-orange-800',
  ai: 'bg-purple-100 text-purple-800',
  finance: 'bg-green-100 text-green-800',
  founder: 'bg-blue-100 text-blue-800',
  lifestyle: 'bg-pink-100 text-pink-800',
  tech: 'bg-cyan-100 text-cyan-800',
  trading: 'bg-red-100 text-red-800',
  motivation: 'bg-yellow-100 text-yellow-800',
};

export function ChannelsTable({ channels }: ChannelsTableProps) {
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const niches = [...new Set(channels.map(ch => ch.niche))];

  const filteredChannels = filter === 'all'
    ? channels
    : channels.filter(ch => ch.niche === filter);

  const handleStatusChange = async (channelId: string, status: 'active' | 'paused' | 'growing') => {
    setIsLoading(true);
    const result = await updateChannelStatus(channelId, status);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Channel ${status === 'active' ? 'activated' : status === 'paused' ? 'paused' : 'set to growing'}`);
    }
  };

  const handleDelete = async (channelId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setIsLoading(true);
    const result = await deleteChannel(channelId);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Channel deleted');
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
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({channels.length})
        </Button>
        {niches.map((niche) => (
          <Button
            key={niche}
            variant={filter === niche ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(niche)}
          >
            {niche.charAt(0).toUpperCase() + niche.slice(1)} ({channels.filter(ch => ch.niche === niche).length})
          </Button>
        ))}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Niche</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead>Total Followers</TableHead>
              <TableHead>Clips</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredChannels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No channels found
                </TableCell>
              </TableRow>
            ) : (
              filteredChannels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{channel.name}</p>
                      {channel.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {channel.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={nicheColors[channel.niche] || 'bg-gray-100 text-gray-800'} variant="outline">
                      {channel.niche}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[channel.status || 'growing']} variant="outline">
                      {channel.status || 'growing'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {channel.tiktokHandle && (
                        <Badge variant="outline" className="text-xs">
                          TT: {formatNumber(channel.tiktokFollowers)}
                        </Badge>
                      )}
                      {channel.instagramHandle && (
                        <Badge variant="outline" className="text-xs">
                          IG: {formatNumber(channel.instagramFollowers)}
                        </Badge>
                      )}
                      {channel.youtubeHandle && (
                        <Badge variant="outline" className="text-xs">
                          YT: {formatNumber(channel.youtubeSubscribers)}
                        </Badge>
                      )}
                      {channel.twitterHandle && (
                        <Badge variant="outline" className="text-xs">
                          X: {formatNumber(channel.twitterFollowers)}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{formatNumber(channel.totalFollowers)}</span>
                  </TableCell>
                  <TableCell>{channel.totalClipsPosted || 0}</TableCell>
                  <TableCell>{formatNumber(channel.totalViews)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={isLoading}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/admin/channels/${channel.id}`}>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Channel
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        {channel.status !== 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(channel.id, 'active')}>
                            Set Active
                          </DropdownMenuItem>
                        )}
                        {channel.status !== 'paused' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(channel.id, 'paused')}>
                            Pause Channel
                          </DropdownMenuItem>
                        )}
                        {channel.status !== 'growing' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(channel.id, 'growing')}>
                            Set as Growing
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(channel.id, channel.name)}
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
