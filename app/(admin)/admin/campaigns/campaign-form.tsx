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
import { Plus, X } from 'lucide-react';
import { createCampaign, updateCampaign } from '@/lib/actions/campaigns';
import type { CampaignFormData } from '@/lib/actions/campaigns';

interface CampaignFormProps {
  campaign?: {
    id: string;
    name: string;
    description: string | null;
    brandName: string | null;
    brandLogoUrl: string | null;
    startDate: Date | null;
    endDate: Date | null;
    budgetCap: string | null;
    status: string | null;
    contentGuidelines: string | null;
    notionUrl: string | null;
    tier1CpmRate: string | null;
    tier2CpmRate: string | null;
    tier3FixedRate: string | null;
    tier1MaxPerClip: string | null;
    tier2MaxPerClip: string | null;
    tier1MaxPerCampaign: string | null;
    tier2MaxPerCampaign: string | null;
    tier3MaxPerCampaign: string | null;
    maxClipsPerClipper: number | null;
    announcement: string | null;
    requiredTags: string[] | null;
  };
}

export function CampaignForm({ campaign }: CampaignFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [newTag, setNewTag] = useState('');

  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    brandName: campaign?.brandName || '',
    brandLogoUrl: campaign?.brandLogoUrl || '',
    startDate: campaign?.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
    endDate: campaign?.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
    budgetCap: parseFloat(campaign?.budgetCap || '0') || 0,
    status: campaign?.status || 'draft',
    contentGuidelines: campaign?.contentGuidelines || '',
    notionUrl: campaign?.notionUrl || '',

    // Tier rates
    tier1CpmRate: parseFloat(campaign?.tier1CpmRate || '0') || 0,
    tier2CpmRate: parseFloat(campaign?.tier2CpmRate || '0') || 0,
    tier3FixedRate: parseFloat(campaign?.tier3FixedRate || '0') || 0,

    // Anti-gaming caps
    tier1MaxPerClip: parseFloat(campaign?.tier1MaxPerClip || '0') || 0,
    tier2MaxPerClip: parseFloat(campaign?.tier2MaxPerClip || '0') || 0,
    tier1MaxPerCampaign: parseFloat(campaign?.tier1MaxPerCampaign || '0') || 0,
    tier2MaxPerCampaign: parseFloat(campaign?.tier2MaxPerCampaign || '0') || 0,
    tier3MaxPerCampaign: parseFloat(campaign?.tier3MaxPerCampaign || '0') || 0,

    // Clip limit
    maxClipsPerClipper: campaign?.maxClipsPerClipper || 0,

    // Announcement
    announcement: campaign?.announcement || '',

    // Tags
    requiredTags: (campaign?.requiredTags as string[]) || [],
  });

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (formData.requiredTags.includes(trimmed)) {
      toast.error('Tag already added');
      return;
    }
    setFormData({ ...formData, requiredTags: [...formData.requiredTags, trimmed] });
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      requiredTags: formData.requiredTags.filter(t => t !== tag),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const submitData: CampaignFormData = {
      name: formData.name,
      description: formData.description || undefined,
      brandName: formData.brandName || undefined,
      brandLogoUrl: formData.brandLogoUrl || undefined,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      budgetCap: formData.budgetCap || undefined,
      status: formData.status as 'draft' | 'active' | 'paused' | 'completed' | undefined,
      contentGuidelines: formData.contentGuidelines || null,
      notionUrl: formData.notionUrl || null,
      tier1CpmRate: formData.tier1CpmRate,
      tier2CpmRate: formData.tier2CpmRate,
      tier3FixedRate: formData.tier3FixedRate,
      tier1MaxPerClip: formData.tier1MaxPerClip || undefined,
      tier2MaxPerClip: formData.tier2MaxPerClip || undefined,
      tier1MaxPerCampaign: formData.tier1MaxPerCampaign || undefined,
      tier2MaxPerCampaign: formData.tier2MaxPerCampaign || undefined,
      tier3MaxPerCampaign: formData.tier3MaxPerCampaign || undefined,
      maxClipsPerClipper: formData.maxClipsPerClipper,
      announcement: formData.announcement || null,
      requiredTags: formData.requiredTags,
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
        {/* Campaign Info */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Info</CardTitle>
            <CardDescription>Basic information about this campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand Name</Label>
                <Input
                  id="brandName"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  placeholder="e.g., Acme Corp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandLogoUrl">Brand Logo URL</Label>
                <Input
                  id="brandLogoUrl"
                  value={formData.brandLogoUrl}
                  onChange={(e) => setFormData({ ...formData, brandLogoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <Label htmlFor="maxClipsPerClipper">Max Clips Per Clipper</Label>
                <Input
                  id="maxClipsPerClipper"
                  type="number"
                  min="0"
                  value={formData.maxClipsPerClipper}
                  onChange={(e) => setFormData({ ...formData, maxClipsPerClipper: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Leave at 0 for unlimited
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tier Rate Config */}
        <Card>
          <CardHeader>
            <CardTitle>Tier Rate Config</CardTitle>
            <CardDescription>
              Set payment rates per tier. Tier 1 and Tier 2 use CPM (cost per 1K views). Tier 3 uses a fixed rate per clip.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="tier1CpmRate">Tier 1 CPM Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id="tier1CpmRate"
                    type="number"
                    step="0.01"
                    value={formData.tier1CpmRate}
                    onChange={(e) => setFormData({ ...formData, tier1CpmRate: parseFloat(e.target.value) || 0 })}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Per 1,000 views</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier2CpmRate">Tier 2 CPM Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id="tier2CpmRate"
                    type="number"
                    step="0.01"
                    value={formData.tier2CpmRate}
                    onChange={(e) => setFormData({ ...formData, tier2CpmRate: parseFloat(e.target.value) || 0 })}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Per 1,000 views</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier3FixedRate">Tier 3 Fixed Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id="tier3FixedRate"
                    type="number"
                    step="0.01"
                    value={formData.tier3FixedRate}
                    onChange={(e) => setFormData({ ...formData, tier3FixedRate: parseFloat(e.target.value) || 0 })}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Fixed amount per clip</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anti-Gaming Caps */}
        <Card>
          <CardHeader>
            <CardTitle>Anti-Gaming Caps</CardTitle>
            <CardDescription>
              Set maximum earnings per clip and per campaign to prevent gaming. Leave at 0 for no cap.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tier1MaxPerClip">Tier 1 Max Per Clip ($)</Label>
                <Input
                  id="tier1MaxPerClip"
                  type="number"
                  step="0.01"
                  value={formData.tier1MaxPerClip}
                  onChange={(e) => setFormData({ ...formData, tier1MaxPerClip: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier2MaxPerClip">Tier 2 Max Per Clip ($)</Label>
                <Input
                  id="tier2MaxPerClip"
                  type="number"
                  step="0.01"
                  value={formData.tier2MaxPerClip}
                  onChange={(e) => setFormData({ ...formData, tier2MaxPerClip: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="tier1MaxPerCampaign">Tier 1 Max Per Campaign ($)</Label>
                <Input
                  id="tier1MaxPerCampaign"
                  type="number"
                  step="0.01"
                  value={formData.tier1MaxPerCampaign}
                  onChange={(e) => setFormData({ ...formData, tier1MaxPerCampaign: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier2MaxPerCampaign">Tier 2 Max Per Campaign ($)</Label>
                <Input
                  id="tier2MaxPerCampaign"
                  type="number"
                  step="0.01"
                  value={formData.tier2MaxPerCampaign}
                  onChange={(e) => setFormData({ ...formData, tier2MaxPerCampaign: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier3MaxPerCampaign">Tier 3 Max Per Campaign ($)</Label>
                <Input
                  id="tier3MaxPerCampaign"
                  type="number"
                  step="0.01"
                  value={formData.tier3MaxPerCampaign}
                  onChange={(e) => setFormData({ ...formData, tier3MaxPerCampaign: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tag Detection */}
        <Card>
          <CardHeader>
            <CardTitle>Tag Detection</CardTitle>
            <CardDescription>
              Required tag patterns that clips must include. Add patterns like @gacha_game_ or #gacha to check for compliance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="e.g., @gacha_game_ or #gacha"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {formData.requiredTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.requiredTags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {formData.requiredTags.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No required tags set. Clips will not be checked for tag compliance.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Announcement */}
        <Card>
          <CardHeader>
            <CardTitle>Clipper Announcement</CardTitle>
            <CardDescription>
              Shown as a popup to assigned clippers on their dashboard. Leave empty for no popup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="announcement"
              value={formData.announcement}
              onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
              placeholder="e.g., Campaign runs for 10 days or until budget is exhausted. Anyone looking botted will be disqualified."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Content Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Content Guidelines</CardTitle>
            <CardDescription>
              Specific guidelines for clippers working on this campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              id="contentGuidelines"
              value={formData.contentGuidelines}
              onChange={(e) => setFormData({ ...formData, contentGuidelines: e.target.value })}
              placeholder="Enter content guidelines for this campaign..."
              rows={6}
            />

            <div className="space-y-2">
              <Label htmlFor="notionUrl">Notion Page URL (optional)</Label>
              <Input
                id="notionUrl"
                value={formData.notionUrl}
                onChange={(e) => setFormData({ ...formData, notionUrl: e.target.value })}
                placeholder="https://notion.so/your-page-id"
              />
              <p className="text-xs text-muted-foreground">
                Paste a public Notion page URL. It will be embedded in the campaign details for clippers to view.
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
