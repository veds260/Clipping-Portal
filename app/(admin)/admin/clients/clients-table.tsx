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
import { MoreHorizontal, Edit, Trash2, Eye, Film } from 'lucide-react';
import { toggleClientStatus, deleteClient } from '@/lib/actions/clients';
import Link from 'next/link';
import { format } from 'date-fns';

interface Client {
  id: string;
  name: string;
  brandName: string | null;
  twitterHandle: string | null;
  logoUrl: string | null;
  monthlyBudget: string | null;
  budgetSpentThisMonth: string | null;
  payRatePer1k: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  clipsCount: number;
  totalViews: number;
}

interface ClientsTableProps {
  clients: Client[];
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const filteredClients = filter === 'all'
    ? clients
    : filter === 'active'
      ? clients.filter(c => c.isActive)
      : clients.filter(c => !c.isActive);

  const handleToggleStatus = async (clientId: string) => {
    setIsLoading(true);
    const result = await toggleClientStatus(clientId);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Client status updated');
    }
  };

  const handleDelete = async (clientId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setIsLoading(true);
    const result = await deleteClient(clientId);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Client deleted');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (value: string | null) => {
    const num = parseFloat(value || '0');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['all', 'active', 'inactive'].map((status) => (
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
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Monthly Budget</TableHead>
              <TableHead>Pay Rate</TableHead>
              <TableHead>Clips</TableHead>
              <TableHead>Total Views</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No clients found
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      {client.brandName && (
                        <p className="text-xs text-muted-foreground">{client.brandName}</p>
                      )}
                      {client.twitterHandle && (
                        <p className="text-xs text-blue-500">@{client.twitterHandle}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={client.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      variant="outline"
                    >
                      {client.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {client.monthlyBudget ? formatCurrency(client.monthlyBudget) : '-'}
                  </TableCell>
                  <TableCell>
                    {client.payRatePer1k ? `$${parseFloat(client.payRatePer1k).toFixed(2)}/1K` : 'Default'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Film className="h-4 w-4 text-muted-foreground" />
                      <span>{client.clipsCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>{formatNumber(client.totalViews)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.createdAt ? format(new Date(client.createdAt), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={isLoading}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/admin/clients/${client.id}`}>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Client
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleStatus(client.id)}>
                          {client.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(client.id, client.name)}
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
