'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { submitClip, checkDuplicateUrl } from '@/lib/actions/clips';
import { Info, AlertTriangle } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  niche: string;
  allowsFillerContent: boolean | null;
  tierRequired: string | null;
}

interface Campaign {
  id: string;
  name: string;
  clientName: string | null;
  tierRequirement: string | null;
}

interface SubmitClipFormProps {
  channels: Channel[];
  campaigns: Campaign[];
  clipperTier: string;
}

const platforms = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram Reels' },
  { value: 'youtube_shorts', label: 'YouTube Shorts' },
  { value: 'twitter', label: 'Twitter/X' },
];

const platformPatterns: Record<string, RegExp> = {
  tiktok: /tiktok\.com/i,
  instagram: /instagram\.com/i,
  youtube_shorts: /youtube\.com|youtu\.be/i,
  twitter: /twitter\.com|x\.com/i,
};

export function SubmitClipForm({ channels, campaigns, clipperTier }: SubmitClipFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    platform: '',
    platformPostUrl: '',
    hook: '',
    title: '',
    description: '',
    channelId: '',
    campaignId: '',
    isFillerContent: false,
    sourceCreator: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [duplicateInfo, setDuplicateInfo] = useState<{
    isDuplicate: boolean;
    clipperName?: string;
    submittedAt?: Date | null;
  } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const selectedChannel = channels.find(c => c.id === formData.channelId);
  const canPostFiller = selectedChannel?.allowsFillerContent ?? false;

  const validateUrl = (url: string, platform: string) => {
    if (!url || !platform) return true;

    const pattern = platformPatterns[platform];
    if (pattern && !pattern.test(url)) {
      return false;
    }

    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlChange = async (url: string) => {
    setFormData({ ...formData, platformPostUrl: url });
    setDuplicateInfo(null);

    if (url && formData.platform) {
      if (!validateUrl(url, formData.platform)) {
        setUrlError(`URL doesn't appear to be a valid ${platforms.find(p => p.value === formData.platform)?.label} link`);
      } else {
        setUrlError('');
        // Check for duplicates
        if (url.length > 10) {
          setCheckingDuplicate(true);
          const result = await checkDuplicateUrl(url);
          setCheckingDuplicate(false);
          if (result.isDuplicate) {
            setDuplicateInfo({
              isDuplicate: true,
              clipperName: result.clipperName,
              submittedAt: result.submittedAt,
            });
          }
        }
      }
    } else {
      setUrlError('');
    }
  };

  const handlePlatformChange = (platform: string) => {
    setFormData({ ...formData, platform });

    if (formData.platformPostUrl && platform) {
      if (!validateUrl(formData.platformPostUrl, platform)) {
        setUrlError(`URL doesn't appear to be a valid ${platforms.find(p => p.value === platform)?.label} link`);
      } else {
        setUrlError('');
      }
    } else {
      setUrlError('');
    }
  };

  const handleChannelChange = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    setFormData({
      ...formData,
      channelId,
      isFillerContent: false,
      sourceCreator: '',
      // Clear campaign if selecting a channel for filler content
      campaignId: channel?.allowsFillerContent ? '' : formData.campaignId,
    });
  };

  const handleFillerToggle = (checked: boolean) => {
    setFormData({
      ...formData,
      isFillerContent: checked,
      campaignId: checked ? '' : formData.campaignId,
      sourceCreator: checked ? formData.sourceCreator : '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.platform || !formData.platformPostUrl || !formData.hook) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.channelId) {
      toast.error('Please select a distribution channel');
      return;
    }

    if (formData.isFillerContent && !formData.sourceCreator) {
      toast.error('Please enter the source creator for filler content');
      return;
    }

    if (urlError) {
      toast.error('Please fix the URL error before submitting');
      return;
    }

    if (duplicateInfo?.isDuplicate) {
      toast.error('This URL has already been submitted. Please use a different clip.');
      return;
    }

    setIsLoading(true);
    const result = await submitClip({
      platform: formData.platform as 'tiktok' | 'instagram' | 'youtube_shorts' | 'twitter',
      platformPostUrl: formData.platformPostUrl,
      hook: formData.hook,
      title: formData.title || undefined,
      description: formData.description || undefined,
      channelId: formData.channelId || undefined,
      campaignId: formData.campaignId || undefined,
      isFillerContent: formData.isFillerContent,
      sourceCreator: formData.sourceCreator || undefined,
    });
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Clip submitted successfully!');
      router.push('/clipper/clips');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Distribution Channel</CardTitle>
          <CardDescription>
            Select where this clip will be posted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel">Channel *</Label>
            <Select
              value={formData.channelId}
              onValueChange={handleChannelChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    <div className="flex items-center gap-2">
                      <span>{channel.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {channel.niche}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {channels.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No channels available for your tier ({clipperTier}). Contact admin to get access.
              </p>
            )}
          </div>

          {selectedChannel && canPostFiller && (
            <div className="flex items-center justify-between border rounded-lg p-4">
              <div>
                <h3 className="font-medium">Filler Content</h3>
                <p className="text-sm text-muted-foreground">
                  This is content from a popular creator (not a client)
                </p>
              </div>
              <Switch
                checked={formData.isFillerContent}
                onCheckedChange={handleFillerToggle}
              />
            </div>
          )}

          {formData.isFillerContent && (
            <div className="space-y-2">
              <Label htmlFor="sourceCreator">Source Creator *</Label>
              <Input
                id="sourceCreator"
                placeholder="e.g., @elonmusk, Naval Ravikant"
                value={formData.sourceCreator}
                onChange={(e) => setFormData({ ...formData, sourceCreator: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Who was clipped in this video? This helps track popular creators.
              </p>
            </div>
          )}

          {!formData.isFillerContent && campaigns.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="campaign">Campaign (Optional)</Label>
              <Select
                value={formData.campaignId}
                onValueChange={(value) => setFormData({ ...formData, campaignId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name} {campaign.clientName && `(${campaign.clientName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link this clip to a specific client campaign
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clip Details</CardTitle>
          <CardDescription>
            Fill in the details about your clip submission
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform *</Label>
            <Select
              value={formData.platform}
              onValueChange={handlePlatformChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Post URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://..."
              value={formData.platformPostUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
            {urlError && (
              <p className="text-sm text-red-500">{urlError}</p>
            )}
            {checkingDuplicate && (
              <p className="text-sm text-muted-foreground">Checking for duplicates...</p>
            )}
            {duplicateInfo?.isDuplicate && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This URL has already been submitted
                  {duplicateInfo.clipperName && ` by ${duplicateInfo.clipperName}`}
                  {duplicateInfo.submittedAt && ` on ${new Date(duplicateInfo.submittedAt).toLocaleDateString()}`}.
                  Please submit a different clip.
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              Paste the direct link to your posted clip
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hook">Hook/Caption *</Label>
            <Textarea
              id="hook"
              placeholder="The hook or caption you used for this clip..."
              value={formData.hook}
              onChange={(e) => setFormData({ ...formData, hook: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              The text hook or caption you wrote for this clip
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              placeholder="Short descriptive title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Notes (optional)</Label>
            <Textarea
              id="description"
              placeholder="Any additional context or notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          After submitting, your clip will be reviewed by the team. You&apos;ll be able to update your view count later.
        </AlertDescription>
      </Alert>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || channels.length === 0 || duplicateInfo?.isDuplicate}>
          {isLoading ? 'Submitting...' : 'Submit Clip'}
        </Button>
      </div>
    </form>
  );
}
