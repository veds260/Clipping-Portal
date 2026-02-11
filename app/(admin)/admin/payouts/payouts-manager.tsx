'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { DollarSign, Users, Film, Calendar, Check, Download, Trash2, Copy } from 'lucide-react';
import { generatePayoutBatch, markPayoutAsPaid, markBatchAsPaid, deleteBatch } from '@/lib/actions/payouts';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

interface ClipperPayout {
  id: string;
  totalViews: number | null;
  clipsCount: number | null;
  amount: string;
  bonusAmount: string | null;
  status: string | null;
  paidAt: Date | null;
  clipper: {
    id: string;
    telegramHandle: string | null;
    walletAddress: string | null;
    walletType: string | null;
    user: {
      name: string | null;
      email: string;
    };
  } | null;
}

interface PayoutBatch {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: string | null;
  clipsCount: number | null;
  status: string | null;
  processedAt: Date | null;
  createdAt: Date | null;
  clipperPayouts: ClipperPayout[];
}

interface PayoutsManagerProps {
  batches: PayoutBatch[];
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  processing: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
};

export function PayoutsManager({ batches }: PayoutsManagerProps) {
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState(format(startOfWeek(subWeeks(new Date(), 1)), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfWeek(subWeeks(new Date(), 1)), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateBatch = async () => {
    setIsLoading(true);
    const result = await generatePayoutBatch(
      new Date(periodStart),
      new Date(periodEnd)
    );
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Payout batch generated: $${result.totalAmount?.toFixed(2)} for ${result.totalClips} clips`);
      setGenerateDialogOpen(false);
    }
  };

  const handleMarkPaid = async (payoutId: string) => {
    setIsLoading(true);
    const result = await markPayoutAsPaid(payoutId);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Payout marked as paid');
    }
  };

  const handleMarkBatchPaid = async (batchId: string) => {
    setIsLoading(true);
    const result = await markBatchAsPaid(batchId);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('All payouts marked as paid');
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this batch? This will reset all clip payouts.')) {
      return;
    }

    setIsLoading(true);
    const result = await deleteBatch(batchId);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Batch deleted successfully');
    }
  };

  const exportBatchCSV = (batch: PayoutBatch) => {
    const headers = ['Name', 'Email', 'Wallet Type', 'Wallet Address', 'Telegram', 'Views', 'Clips', 'Amount', 'Bonus', 'Status'];
    const rows = batch.clipperPayouts.map(p => [
      p.clipper?.user.name || 'Unknown',
      p.clipper?.user.email || '',
      p.clipper?.walletType || '',
      p.clipper?.walletAddress || '',
      p.clipper?.telegramHandle || '',
      p.totalViews?.toString() || '0',
      p.clipsCount?.toString() || '0',
      p.amount,
      p.bonusAmount || '0',
      p.status || 'pending',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-batch-${format(new Date(batch.periodStart), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const formatCurrency = (amount: string | null) => {
    const value = parseFloat(amount || '0');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const pendingTotal = batches
    .filter(b => b.status === 'draft' || b.status === 'processing')
    .reduce((sum, b) => sum + parseFloat(b.totalAmount || '0'), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingTotal.toString())}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.length}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setGenerateDialogOpen(true)}>
              Generate Payout Batch
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Batches List */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Batches</CardTitle>
          <CardDescription>
            View and manage payout batches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No payout batches yet. Generate one to get started.
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {batches.map((batch) => (
                <AccordionItem key={batch.id} value={batch.id}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-4 text-left">
                      <div>
                        <p className="font-medium">
                          {format(new Date(batch.periodStart), 'MMM d')} - {format(new Date(batch.periodEnd), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {batch.clipperPayouts.length} clippers, {batch.clipsCount} clips
                        </p>
                      </div>
                      <Badge className={statusColors[batch.status || 'draft']} variant="outline">
                        {batch.status}
                      </Badge>
                      <span className="font-bold">{formatCurrency(batch.totalAmount)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportBatchCSV(batch)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                        {batch.status !== 'completed' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleMarkBatchPaid(batch.id)}
                              disabled={isLoading}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Mark All Paid
                            </Button>
                            {batch.status === 'draft' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteBatch(batch.id)}
                                disabled={isLoading}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Batch
                              </Button>
                            )}
                          </>
                        )}
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Clipper</TableHead>
                            <TableHead>Wallet</TableHead>
                            <TableHead>Views</TableHead>
                            <TableHead>Clips</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Bonus</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batch.clipperPayouts.map((payout) => (
                            <TableRow key={payout.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{payout.clipper?.user.name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {payout.clipper?.user.email}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {payout.clipper?.walletAddress ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">{payout.clipper.walletType || 'EVM'}</span>
                                    <code className="text-xs text-muted-foreground">
                                      {payout.clipper.walletAddress.slice(0, 6)}...{payout.clipper.walletAddress.slice(-4)}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => {
                                        navigator.clipboard.writeText(payout.clipper!.walletAddress!);
                                        toast.success('Wallet address copied');
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No wallet</span>
                                )}
                              </TableCell>
                              <TableCell>{payout.totalViews?.toLocaleString() || 0}</TableCell>
                              <TableCell>{payout.clipsCount || 0}</TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(payout.amount)}
                              </TableCell>
                              <TableCell>
                                {parseFloat(payout.bonusAmount || '0') > 0 && (
                                  <span className="text-green-600">
                                    +{formatCurrency(payout.bonusAmount)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={statusColors[payout.status || 'pending']} variant="outline">
                                  {payout.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {payout.status !== 'paid' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkPaid(payout.id)}
                                    disabled={isLoading}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Payout Batch</DialogTitle>
            <DialogDescription>
              Generate payouts for all approved clips in the selected period. Only clips with 1,000+ views will be included in the payout calculation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="periodStart">Period Start</Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="periodEnd">Period End</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateBatch} disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate Batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
