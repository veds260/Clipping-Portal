'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { updatePayoutSettings, updateContentSettings, updateTierSettings } from '@/lib/actions/settings';

interface SettingsFormProps {
  settings: {
    payout: {
      minimum_views_for_payout: number;
      bonus_threshold_views: number;
      bonus_multiplier: number;
    };
    content: {
      minimum_clip_duration: number;
      maximum_clip_duration: number;
      content_guidelines: string;
    };
    tier: {
      tier_approved_min_clips: number;
      tier_core_min_views: number;
      tier_core_min_clips: number;
      tier_approved_min_avg_views: number;
      tier_core_min_avg_views: number;
      entry_benefits: string;
      approved_benefits: string;
      core_benefits: string;
      entry_pay_rate: number;
      approved_pay_rate: number;
      core_pay_rate: number;
    };
  };
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [payoutData, setPayoutData] = useState(settings.payout);
  const [contentData, setContentData] = useState(settings.content);
  const [tierData, setTierData] = useState(settings.tier);
  const [isLoading, setIsLoading] = useState(false);

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await updatePayoutSettings(payoutData);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Payout settings saved');
    }
  };

  const handleContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await updateContentSettings(contentData);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Content settings saved');
    }
  };

  const handleTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await updateTierSettings(tierData);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Tier settings saved');
    }
  };

  return (
    <Tabs defaultValue="payout" className="space-y-4">
      <TabsList>
        <TabsTrigger value="payout">Payout Settings</TabsTrigger>
        <TabsTrigger value="content">Content Requirements</TabsTrigger>
        <TabsTrigger value="tier">Tier Thresholds</TabsTrigger>
      </TabsList>

      <TabsContent value="payout">
        <Card>
          <CardHeader>
            <CardTitle>Payout Settings</CardTitle>
            <CardDescription>
              Configure payout rules. Pay rates are set per tier in "Tier Thresholds" tab.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min_views">Minimum Views for Payout</Label>
                  <Input
                    id="min_views"
                    type="number"
                    value={payoutData.minimum_views_for_payout}
                    onChange={(e) => setPayoutData({
                      ...payoutData,
                      minimum_views_for_payout: parseInt(e.target.value) || 0,
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Clips must reach this threshold to qualify for payment
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bonus_threshold">Viral Bonus Threshold (views)</Label>
                  <Input
                    id="bonus_threshold"
                    type="number"
                    value={payoutData.bonus_threshold_views}
                    onChange={(e) => setPayoutData({
                      ...payoutData,
                      bonus_threshold_views: parseInt(e.target.value) || 0,
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Clips exceeding this get the bonus multiplier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bonus_multiplier">Bonus Multiplier</Label>
                  <Input
                    id="bonus_multiplier"
                    type="number"
                    step="0.1"
                    value={payoutData.bonus_multiplier}
                    onChange={(e) => setPayoutData({
                      ...payoutData,
                      bonus_multiplier: parseFloat(e.target.value) || 1,
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g., 1.5 means 50% bonus for viral clips
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Payout Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="content">
        <Card>
          <CardHeader>
            <CardTitle>Content Requirements</CardTitle>
            <CardDescription>
              Set clip duration limits and content guidelines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContentSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min_duration">Minimum Duration (seconds)</Label>
                  <Input
                    id="min_duration"
                    type="number"
                    value={contentData.minimum_clip_duration}
                    onChange={(e) => setContentData({
                      ...contentData,
                      minimum_clip_duration: parseInt(e.target.value) || 0,
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_duration">Maximum Duration (seconds)</Label>
                  <Input
                    id="max_duration"
                    type="number"
                    value={contentData.maximum_clip_duration}
                    onChange={(e) => setContentData({
                      ...contentData,
                      maximum_clip_duration: parseInt(e.target.value) || 0,
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guidelines">Content Guidelines</Label>
                <Textarea
                  id="guidelines"
                  rows={10}
                  value={contentData.content_guidelines}
                  onChange={(e) => setContentData({
                    ...contentData,
                    content_guidelines: e.target.value,
                  })}
                  placeholder="Enter content guidelines for clippers..."
                />
                <p className="text-xs text-muted-foreground">
                  These guidelines will be shown to clippers on the guidelines page
                </p>
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Content Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tier">
        <Card>
          <CardHeader>
            <CardTitle>Tier Thresholds</CardTitle>
            <CardDescription>
              Configure requirements and benefits for clipper tier promotions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTierSubmit} className="space-y-8">
              {/* Entry Tier */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  Entry Tier
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="entry_pay_rate">Pay Rate ($ per 1K views)</Label>
                    <Input
                      id="entry_pay_rate"
                      type="number"
                      step="0.01"
                      value={tierData.entry_pay_rate || 0}
                      onChange={(e) => setTierData({
                        ...tierData,
                        entry_pay_rate: parseFloat(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entry_benefits">Benefits (shown to clippers)</Label>
                    <Textarea
                      id="entry_benefits"
                      rows={3}
                      value={tierData.entry_benefits || ''}
                      onChange={(e) => setTierData({
                        ...tierData,
                        entry_benefits: e.target.value,
                      })}
                      placeholder="e.g., Access to basic campaigns, Feedback on clips"
                    />
                  </div>
                </div>
              </div>

              {/* Approved Tier */}
              <div className="border rounded-lg p-4 border-blue-200 bg-blue-50/30">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Approved Tier
                </h3>
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="approved_clips">Min Approved Clips Required</Label>
                    <Input
                      id="approved_clips"
                      type="number"
                      value={tierData.tier_approved_min_clips}
                      onChange={(e) => setTierData({
                        ...tierData,
                        tier_approved_min_clips: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approved_avg_views">Min Avg Views per Clip</Label>
                    <Input
                      id="approved_avg_views"
                      type="number"
                      value={tierData.tier_approved_min_avg_views}
                      onChange={(e) => setTierData({
                        ...tierData,
                        tier_approved_min_avg_views: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approved_pay_rate">Pay Rate ($ per 1K views)</Label>
                    <Input
                      id="approved_pay_rate"
                      type="number"
                      step="0.01"
                      value={tierData.approved_pay_rate || 0}
                      onChange={(e) => setTierData({
                        ...tierData,
                        approved_pay_rate: parseFloat(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approved_benefits">Benefits (shown to clippers)</Label>
                    <Textarea
                      id="approved_benefits"
                      rows={3}
                      value={tierData.approved_benefits || ''}
                      onChange={(e) => setTierData({
                        ...tierData,
                        approved_benefits: e.target.value,
                      })}
                      placeholder="e.g., Higher pay rate, Priority campaign access, Direct support channel"
                    />
                  </div>
                </div>
              </div>

              {/* Core Tier */}
              <div className="border rounded-lg p-4 border-purple-200 bg-purple-50/30">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  Core Tier
                </h3>
                <div className="grid gap-4 md:grid-cols-3 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="core_views">Min Total Views Required</Label>
                    <Input
                      id="core_views"
                      type="number"
                      value={tierData.tier_core_min_views}
                      onChange={(e) => setTierData({
                        ...tierData,
                        tier_core_min_views: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="core_clips">Min Approved Clips</Label>
                    <Input
                      id="core_clips"
                      type="number"
                      value={tierData.tier_core_min_clips}
                      onChange={(e) => setTierData({
                        ...tierData,
                        tier_core_min_clips: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="core_avg_views">Min Avg Views per Clip</Label>
                    <Input
                      id="core_avg_views"
                      type="number"
                      value={tierData.tier_core_min_avg_views}
                      onChange={(e) => setTierData({
                        ...tierData,
                        tier_core_min_avg_views: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="core_pay_rate">Pay Rate ($ per 1K views)</Label>
                    <Input
                      id="core_pay_rate"
                      type="number"
                      step="0.01"
                      value={tierData.core_pay_rate || 0}
                      onChange={(e) => setTierData({
                        ...tierData,
                        core_pay_rate: parseFloat(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="core_benefits">Benefits (shown to clippers)</Label>
                    <Textarea
                      id="core_benefits"
                      rows={3}
                      value={tierData.core_benefits || ''}
                      onChange={(e) => setTierData({
                        ...tierData,
                        core_benefits: e.target.value,
                      })}
                      placeholder="e.g., Top pay rate, Monthly retainer, 1-on-1 mentorship, First access to new campaigns"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Tier Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
