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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { createChannel, updateChannel } from '@/lib/actions/channels';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChannelFormProps {
  channel?: {
    id: string;
    name: string;
    niche: string;
    description: string | null;
    tiktokHandle: string | null;
    tiktokUrl: string | null;
    tiktokFollowers: number | null;
    instagramHandle: string | null;
    instagramUrl: string | null;
    instagramFollowers: number | null;
    youtubeHandle: string | null;
    youtubeUrl: string | null;
    youtubeSubscribers: number | null;
    twitterHandle: string | null;
    twitterUrl: string | null;
    twitterFollowers: number | null;
    status: string | null;
    tierRequired: string | null;
    contentGuidelines: string | null;
    targetAudience: string | null;
    exampleContent: string | null;
    allowsFillerContent: boolean | null;
    fillerContentSources: string | null;
  };
}

const NICHES = [
  { value: 'crypto', label: 'Crypto & Web3' },
  { value: 'ai', label: 'AI & Machine Learning' },
  { value: 'finance', label: 'Finance & Investing' },
  { value: 'trading', label: 'Trading & Markets' },
  { value: 'founder', label: 'Founders & Startups' },
  { value: 'tech', label: 'Tech & Innovation' },
  { value: 'lifestyle', label: 'Lifestyle & Luxury' },
  { value: 'motivation', label: 'Motivation & Success' },
];

export function ChannelForm({ channel }: ChannelFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: channel?.name || '',
    niche: channel?.niche || '',
    description: channel?.description || '',
    tiktokHandle: channel?.tiktokHandle || '',
    tiktokUrl: channel?.tiktokUrl || '',
    tiktokFollowers: channel?.tiktokFollowers || 0,
    instagramHandle: channel?.instagramHandle || '',
    instagramUrl: channel?.instagramUrl || '',
    instagramFollowers: channel?.instagramFollowers || 0,
    youtubeHandle: channel?.youtubeHandle || '',
    youtubeUrl: channel?.youtubeUrl || '',
    youtubeSubscribers: channel?.youtubeSubscribers || 0,
    twitterHandle: channel?.twitterHandle || '',
    twitterUrl: channel?.twitterUrl || '',
    twitterFollowers: channel?.twitterFollowers || 0,
    status: (channel?.status as 'active' | 'paused' | 'growing') || 'growing',
    tierRequired: (channel?.tierRequired as 'entry' | 'approved' | 'core') || 'core',
    contentGuidelines: channel?.contentGuidelines || '',
    targetAudience: channel?.targetAudience || '',
    exampleContent: channel?.exampleContent || '',
    allowsFillerContent: channel?.allowsFillerContent ?? true,
    fillerContentSources: channel?.fillerContentSources || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = channel
      ? await updateChannel(channel.id, formData)
      : await createChannel(formData);

    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(channel ? 'Channel updated' : 'Channel created');
      router.push('/admin/channels');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="basics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basics">Basic Info</TabsTrigger>
          <TabsTrigger value="platforms">Platform Accounts</TabsTrigger>
          <TabsTrigger value="content">Content Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="basics">
          <Card>
            <CardHeader>
              <CardTitle>Channel Information</CardTitle>
              <CardDescription>Basic details about this distribution channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Channel Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Crypto Alpha"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="niche">Niche *</Label>
                  <Select
                    value={formData.niche}
                    onValueChange={(value) => setFormData({ ...formData, niche: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select niche" />
                    </SelectTrigger>
                    <SelectContent>
                      {NICHES.map((niche) => (
                        <SelectItem key={niche.value} value={niche.value}>
                          {niche.label}
                        </SelectItem>
                      ))}
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
                  placeholder="What is this channel about? What type of content does it feature?"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'paused' | 'growing') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="growing">Growing (Building Audience)</SelectItem>
                      <SelectItem value="active">Active (Ready for Client Content)</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tierRequired">Minimum Tier to Post</Label>
                  <Select
                    value={formData.tierRequired}
                    onValueChange={(value: 'entry' | 'approved' | 'core') =>
                      setFormData({ ...formData, tierRequired: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry (Anyone)</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="core">Core Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms">
          <Card>
            <CardHeader>
              <CardTitle>Platform Accounts</CardTitle>
              <CardDescription>Social media accounts for this channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* TikTok */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-4">TikTok</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Handle</Label>
                    <Input
                      value={formData.tiktokHandle}
                      onChange={(e) => setFormData({ ...formData, tiktokHandle: e.target.value })}
                      placeholder="@handle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Profile URL</Label>
                    <Input
                      value={formData.tiktokUrl}
                      onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
                      placeholder="https://tiktok.com/@..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Followers</Label>
                    <Input
                      type="number"
                      value={formData.tiktokFollowers}
                      onChange={(e) => setFormData({ ...formData, tiktokFollowers: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Instagram */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-4">Instagram</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Handle</Label>
                    <Input
                      value={formData.instagramHandle}
                      onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
                      placeholder="@handle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Profile URL</Label>
                    <Input
                      value={formData.instagramUrl}
                      onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Followers</Label>
                    <Input
                      type="number"
                      value={formData.instagramFollowers}
                      onChange={(e) => setFormData({ ...formData, instagramFollowers: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* YouTube */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-4">YouTube</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Handle</Label>
                    <Input
                      value={formData.youtubeHandle}
                      onChange={(e) => setFormData({ ...formData, youtubeHandle: e.target.value })}
                      placeholder="@handle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Channel URL</Label>
                    <Input
                      value={formData.youtubeUrl}
                      onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                      placeholder="https://youtube.com/@..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subscribers</Label>
                    <Input
                      type="number"
                      value={formData.youtubeSubscribers}
                      onChange={(e) => setFormData({ ...formData, youtubeSubscribers: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Twitter/X */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-4">Twitter/X</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Handle</Label>
                    <Input
                      value={formData.twitterHandle}
                      onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
                      placeholder="@handle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Profile URL</Label>
                    <Input
                      value={formData.twitterUrl}
                      onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                      placeholder="https://x.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Followers</Label>
                    <Input
                      type="number"
                      value={formData.twitterFollowers}
                      onChange={(e) => setFormData({ ...formData, twitterFollowers: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Content Strategy</CardTitle>
              <CardDescription>Define what content works for this channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Textarea
                  id="targetAudience"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  placeholder="Who is this channel for? What are their interests, pain points, aspirations?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentGuidelines">Content Guidelines</Label>
                <Textarea
                  id="contentGuidelines"
                  value={formData.contentGuidelines}
                  onChange={(e) => setFormData({ ...formData, contentGuidelines: e.target.value })}
                  placeholder="What type of clips work best? Tone, style, topics to avoid..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exampleContent">Example Content (What Works)</Label>
                <Textarea
                  id="exampleContent"
                  value={formData.exampleContent}
                  onChange={(e) => setFormData({ ...formData, exampleContent: e.target.value })}
                  placeholder="Links or descriptions of successful clips on this channel..."
                  rows={3}
                />
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Allow Filler Content</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable non-client content to keep the channel active and growing
                    </p>
                  </div>
                  <Switch
                    checked={formData.allowsFillerContent}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, allowsFillerContent: checked })
                    }
                  />
                </div>

                {formData.allowsFillerContent && (
                  <div className="space-y-2">
                    <Label htmlFor="fillerContentSources">Filler Content Sources</Label>
                    <Textarea
                      id="fillerContentSources"
                      value={formData.fillerContentSources}
                      onChange={(e) => setFormData({ ...formData, fillerContentSources: e.target.value })}
                      placeholder="Popular creators/accounts to clip from when there's no client content. One per line."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      List accounts whose content can be clipped to keep the channel active
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-4 mt-6">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : channel ? 'Update Channel' : 'Create Channel'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
