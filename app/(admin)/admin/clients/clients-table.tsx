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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MoreHorizontal, Edit, Trash2, Eye, Film, Key, Mail } from 'lucide-react';
import { toggleClientStatus } from '@/lib/actions/clients';
import { updateUserPassword, updateUserEmail, deleteClientData } from '@/lib/actions/admin-users';
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
  userId: string | null;
  user: {
    id: string;
    email: string;
  } | null;
}

interface ClientsTableProps {
  clients: Client[];
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

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

  const openPasswordDialog = (client: Client) => {
    setSelectedClient(client);
    setNewPassword('');
    setPasswordDialogOpen(true);
  };

  const openEmailDialog = (client: Client) => {
    setSelectedClient(client);
    setNewEmail(client.user?.email || '');
    setEmailDialogOpen(true);
  };

  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client);
    setDeleteConfirmation('');
    setDeleteDialogOpen(true);
  };

  const handlePasswordChange = async () => {
    if (!selectedClient || !selectedClient.user || !newPassword) return;

    setIsLoading(true);
    const result = await updateUserPassword(selectedClient.user.id, newPassword);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Password updated');
      setPasswordDialogOpen(false);
      setSelectedClient(null);
      setNewPassword('');
    }
  };

  const handleEmailChange = async () => {
    if (!selectedClient || !selectedClient.user || !newEmail) return;

    setIsLoading(true);
    const result = await updateUserEmail(selectedClient.user.id, newEmail);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Email updated');
      setEmailDialogOpen(false);
      setSelectedClient(null);
      setNewEmail('');
    }
  };

  const handleDelete = async () => {
    if (!selectedClient || deleteConfirmation !== 'DELETE') return;

    setIsLoading(true);
    const result = await deleteClientData(selectedClient.id);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Client deleted');
      setDeleteDialogOpen(false);
      setSelectedClient(null);
      setDeleteConfirmation('');
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
                        {client.user && (
                          <>
                            <DropdownMenuItem onClick={() => openEmailDialog(client)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Change Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPasswordDialog(client)}>
                              <Key className="h-4 w-4 mr-2" />
                              Change Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => handleToggleStatus(client.id)}>
                          {client.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(client)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Client
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

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedClient?.name || 'this client'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-display">Email</Label>
              <Input
                id="email-display"
                value={selectedClient?.user?.email || ''}
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
              Update the email address for {selectedClient?.name || 'this client'}.
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
            <DialogTitle className="text-red-600">Delete Client</DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedClient?.name || 'this client'} and all their data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will delete:
              </p>
              <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                <li>The client profile</li>
                <li>All campaigns</li>
                <li>All clips associated with this client</li>
                <li>The user account (if linked)</li>
              </ul>
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
              {isLoading ? 'Deleting...' : 'Delete Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
