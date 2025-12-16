'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createCampaign, updateCampaign } from '@/lib/actions/campaigns';

interface Client {
  id: string;
  name: string;
  brandName: string | null;
}

interface CampaignFormProps {
  campaign?: {
    id: string;
    clientId: string | null;
    name: string;
    description: string | null;
    sourceContentUrl: string | null;
    sourceContentType: string | null;
    startDate: Date | null;
    endDate: Date | null;
    budgetCap: string | null;
    payRatePer1k: string | null;
    status: string | null;
    tierRequirement: string | null;
  };
  clients: Client[];
}

export function CampaignForm({ campaign, clients }: CampaignFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    clientId: campaign?.clientId || '',
    name: campaign?.name || '',
    description: campaign?.description || '',
    sourceContentUrl: campaign?.sourceContentUrl || '',
    sourceContentType: campaign?.sourceContentType || '',
    startDate: campaign?.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
    endDate: campaign?.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
    budgetCap: parseFloat(campaign?.budgetCap || '0') || 0,
    payRatePer1k: parseFloat(campaign?.payRatePer1k || '0') || 0,
    status: campaign?.status || 'draft',
    tierRequirement: campaign?.tierRequirement || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const submitData = {
      clientId: formData.clientId,
      name: formData.name,
      description: formData.description || undefined,
      sourceContentUrl: formData.sourceContentUrl || undefined,
      sourceContentType: formData.sourceContentType as 'podcast' | 'interview' | 'livestream' | 'other' | undefined,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      budgetCap: formData.budgetCap || undefined,
      payRatePer1k: formData.payRatePer1k || undefined,
      status: formData.status as 'draft' | 'active' | 'paused' | 'completed' | undefined,
      tierRequirement: formData.tierRequirement as 'entry' | 'approved' | 'core' | undefined,
    };

    const result = campaign
      ? await updateCampaign(campaign.id, submitData)
      : await createCampaign(submitData);

    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(campaign ? 'Campaign updated' : 'Campaign created');
      router.push('/admin/campaigns');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>Basic information about this campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client *</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.brandName && `(${client.brandName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Q1 Product Launch"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Campaign goals, key messaging points, etc."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source Content</CardTitle>
            <CardDescription>Original content that clippers will create clips from</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sourceContentUrl">Source Content URL</Label>
                <Input
                  id="sourceContentUrl"
                  value={formData.sourceContentUrl}
                  onChange={(e) => setFormData({ ...formData, sourceContentUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceContentType">Content Type</Label>
                <Select
                  value={formData.sourceContentType}
                  onValueChange={(value) => setFormData({ ...formData, sourceContentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="podcast">Podcast</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="livestream">Livestream</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule & Budget</CardTitle>
            <CardDescription>Campaign timeline and financial settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budgetCap">Budget Cap ($)</Label>
                <Input
                  id="budgetCap"
                  type="number"
                  step="0.01"
                  value={formData.budgetCap}
                  onChange={(e) => setFormData({ ...formData, budgetCap: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Leave at 0 for unlimited
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payRatePer1k">Custom Pay Rate ($ per 1K views)</Label>
                <Input
                  id="payRatePer1k"
                  type="number"
                  step="0.01"
                  value={formData.payRatePer1k}
                  onChange={(e) => setFormData({ ...formData, payRatePer1k: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Leave at 0 to use tier-based rates
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
            <CardDescription>Who can participate in this campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="tierRequirement">Minimum Tier Requirement</Label>
              <Select
                value={formData.tierRequirement}
                onValueChange={(value) => setFormData({ ...formData, tierRequirement: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any tier (no restriction)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only clippers at or above this tier can submit clips for this campaign
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 mt-6">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
