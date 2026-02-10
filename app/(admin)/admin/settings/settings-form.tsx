'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { updatePayoutSettings, updateContentSettings } from '@/lib/actions/settings';
import { deleteEntireDatabase } from '@/lib/actions/admin-users';

interface SettingsFormProps {
  settings: {
    payout: {
      minimum_views_for_payout: number;
    };
    content: {
      content_guidelines: string;
    };
  };
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [payoutData, setPayoutData] = useState(settings.payout);
  const [contentData, setContentData] = useState(settings.content);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

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

  const handleDeleteDatabase = async () => {
    if (deleteConfirmation !== 'DELETE EVERYTHING') return;

    setIsLoading(true);
    const result = await deleteEntireDatabase(deleteConfirmation);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Database cleared successfully');
      setDeleteConfirmation('');
      window.location.reload();
    }
  };

  return (
    <Tabs defaultValue="payout" className="space-y-4">
      <TabsList>
        <TabsTrigger value="payout">Payout Settings</TabsTrigger>
        <TabsTrigger value="content">Content Guidelines</TabsTrigger>
        <TabsTrigger value="danger" className="text-red-600">Danger Zone</TabsTrigger>
      </TabsList>

      <TabsContent value="payout">
        <Card>
          <CardHeader>
            <CardTitle>Payout Settings</CardTitle>
            <CardDescription>
              Configure global payout rules. Per-campaign tier rates and caps are set in each campaign's settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePayoutSubmit} className="space-y-4">
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
                  Clips must reach this view threshold to qualify for payment
                </p>
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
            <CardTitle>Content Guidelines</CardTitle>
            <CardDescription>
              Global content guidelines shown to all clippers. Campaign-specific guidelines are set per campaign.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContentSubmit} className="space-y-4">
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

      <TabsContent value="danger">
        <Card className="border-red-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions. Proceed with extreme caution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border border-red-900/50 rounded-lg p-6 bg-red-950/20">
              <h3 className="text-lg font-medium text-red-400 mb-2">Delete Entire Database</h3>
              <p className="text-sm text-red-300/70 mb-4">
                This will permanently delete ALL data from the platform including:
              </p>
              <ul className="text-sm text-red-300/70 list-disc list-inside mb-4">
                <li>All clippers and their profiles</li>
                <li>All campaigns and assignments</li>
                <li>All clips and view data</li>
                <li>All payout records</li>
                <li>All activity logs</li>
              </ul>
              <p className="text-sm text-red-400 font-medium mb-4">
                Only the admin account will be preserved. This action cannot be undone.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="delete-db-confirm" className="text-red-400">
                    Type DELETE EVERYTHING to confirm
                  </Label>
                  <Input
                    id="delete-db-confirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE EVERYTHING"
                    className="mt-2 border-red-900/50"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteDatabase}
                  disabled={isLoading || deleteConfirmation !== 'DELETE EVERYTHING'}
                  className="w-full"
                >
                  {isLoading ? 'Deleting...' : 'Delete Entire Database'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
