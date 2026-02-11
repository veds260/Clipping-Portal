'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Info, AlertTriangle, Loader2, Eye, Heart, Repeat2, MessageCircle, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  brandName: string | null;
  assignedTier: string;
  requiredTags: string[] | null;
  maxClipsPerClipper: number;
  submittedClips: number;
  tier1CpmRate: string | null;
  tier2CpmRate: string | null;
  tier3FixedRate: string | null;
  notionUrl: string | null;
}

interface SubmitClipFormProps {
  campaigns: Campaign[];
}

interface TweetPreview {
  views: number;
  likes: number;
  retweets: number;
  replies: number;
  text: string;
  authorUsername: string;
}

interface TagCompliance {
  compliant: boolean;
  found: string[];
  missing: string[];
}

const tierColors: Record<string, string> = {
  tier1: 'bg-emerald-900/30 text-emerald-400 border-emerald-700',
  tier2: 'bg-blue-900/30 text-blue-400 border-blue-700',
  tier3: 'bg-purple-900/30 text-purple-400 border-purple-700',
};

const tierLabels: Record<string, string> = {
  tier1: 'Tier 1',
  tier2: 'Tier 2',
  tier3: 'Tier 3',
};

function formatNumber(num: number | null) {
  if (num === null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function SubmitClipForm({ campaigns }: SubmitClipFormProps) {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState('');
  const [platformPostUrl, setPlatformPostUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [tweetPreview, setTweetPreview] = useState<TweetPreview | null>(null);
  const [tagCompliance, setTagCompliance] = useState<TagCompliance | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    isDuplicate: boolean;
    clipperName?: string;
    submittedAt?: Date | null;
  } | null>(null);
  const [urlError, setUrlError] = useState('');

  const isTwitterUrl = (url: string) => {
    return /twitter\.com|x\.com/i.test(url);
  };

  const fetchTweetPreview = async (url: string) => {
    if (!url || !isTwitterUrl(url) || !campaignId) return;

    setIsFetchingPreview(true);
    setTweetPreview(null);
    setTagCompliance(null);

    try {
      const res = await fetch(`/api/twitter/tweet?url=${encodeURIComponent(url)}&campaignId=${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tweet) {
          setTweetPreview({
            views: data.tweet.views || 0,
            likes: data.tweet.likes || 0,
            retweets: data.tweet.retweets || 0,
            replies: data.tweet.replies || 0,
            text: data.tweet.text || '',
            authorUsername: data.tweet.authorUsername || '',
          });
        }
        if (data.tagCompliance) {
          setTagCompliance(data.tagCompliance);
        }
      } else {
        const errData = await res.json().catch(() => null);
        setUrlError(errData?.error || 'Failed to fetch tweet data');
      }
    } catch {
      setUrlError('Failed to fetch tweet data');
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const handleUrlChange = async (url: string) => {
    setPlatformPostUrl(url);
    setDuplicateInfo(null);
    setUrlError('');
    setTweetPreview(null);
    setTagCompliance(null);

    if (!url) return;

    if (!isTwitterUrl(url)) {
      setUrlError('Please enter a valid Twitter/X URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      setUrlError('Please enter a valid URL');
      return;
    }

    // Check for duplicates
    if (url.length > 10) {
      const result = await checkDuplicateUrl(url);
      if (result.isDuplicate) {
        setDuplicateInfo({
          isDuplicate: true,
          clipperName: result.clipperName,
          submittedAt: result.submittedAt,
        });
        return;
      }
    }

    // Auto-fetch preview if campaign is selected
    if (campaignId) {
      fetchTweetPreview(url);
    }
  };

  const handleCampaignChange = (value: string) => {
    setCampaignId(value);
    // Re-fetch preview if URL is already entered
    if (platformPostUrl && isTwitterUrl(platformPostUrl) && !duplicateInfo?.isDuplicate) {
      setIsFetchingPreview(true);
      setTweetPreview(null);
      setTagCompliance(null);
      fetch(`/api/twitter/tweet?url=${encodeURIComponent(platformPostUrl)}&campaignId=${value}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.tweet) {
            setTweetPreview({
              views: data.tweet.views || 0,
              likes: data.tweet.likes || 0,
              retweets: data.tweet.retweets || 0,
              replies: data.tweet.replies || 0,
              text: data.tweet.text || '',
              authorUsername: data.tweet.authorUsername || '',
            });
          }
          if (data?.tagCompliance) {
            setTagCompliance(data.tagCompliance);
          }
        })
        .catch(() => {})
        .finally(() => setIsFetchingPreview(false));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaignId) {
      toast.error('Please select a campaign');
      return;
    }

    if (!platformPostUrl) {
      toast.error('Please enter a tweet URL');
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
      campaignId,
      platformPostUrl,
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
          <CardTitle>Campaign</CardTitle>
          <CardDescription>
            Select the campaign this clip belongs to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign">Campaign *</Label>
            <Select value={campaignId} onValueChange={handleCampaignChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => {
                  const atLimit = campaign.maxClipsPerClipper > 0 && campaign.submittedClips >= campaign.maxClipsPerClipper;
                  return (
                    <SelectItem key={campaign.id} value={campaign.id} disabled={atLimit}>
                      <div className="flex items-center gap-2">
                        <span>{campaign.name}</span>
                        {campaign.brandName && (
                          <span className="text-muted-foreground">({campaign.brandName})</span>
                        )}
                        {campaign.maxClipsPerClipper > 0 && (
                          <span className={`text-xs ${atLimit ? 'text-red-400' : 'text-muted-foreground'}`}>
                            {campaign.submittedClips}/{campaign.maxClipsPerClipper} clips
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {campaigns.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No campaigns available. Admins will assign you to campaigns when ready.
              </p>
            )}
            {campaignId && (() => {
              const selected = campaigns.find(c => c.id === campaignId);
              if (!selected) return null;
              return (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-primary">
                    Your rate:{' '}
                    {selected.assignedTier === 'tier3'
                      ? `$${parseFloat(selected.tier3FixedRate || '0').toFixed(2)} per clip`
                      : selected.assignedTier === 'tier2'
                        ? `$${parseFloat(selected.tier2CpmRate || '0').toFixed(2)} per 1K views`
                        : `$${parseFloat(selected.tier1CpmRate || '0').toFixed(2)} per 1K views`}
                  </p>
                  {selected.notionUrl && (
                    <a
                      href={selected.notionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md border bg-muted/50 hover:bg-muted transition-colors text-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">View Guidelines & Assets</span>
                    </a>
                  )}
                  {selected.maxClipsPerClipper > 0 && (() => {
                    const remaining = selected.maxClipsPerClipper - selected.submittedClips;
                    return (
                      <p className={`text-sm ${remaining <= 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {remaining <= 0
                          ? 'You have reached the clip limit for this campaign.'
                          : `${remaining} clip${remaining === 1 ? '' : 's'} remaining for this campaign.`
                        }
                      </p>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tweet URL</CardTitle>
          <CardDescription>
            Paste the link to your posted tweet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Tweet URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://x.com/username/status/..."
              value={platformPostUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
            {urlError && (
              <p className="text-sm text-red-500">{urlError}</p>
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
          </div>

          {/* Tweet Preview */}
          {isFetchingPreview && (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Fetching tweet data...</span>
            </div>
          )}

          {tweetPreview && !isFetchingPreview && (
            <Card className="border-border/50 bg-muted/30">
              <CardContent className="pt-4 space-y-3">
                {tweetPreview.authorUsername && (
                  <p className="text-xs text-muted-foreground">
                    @{tweetPreview.authorUsername}
                  </p>
                )}
                {tweetPreview.text && (
                  <p className="text-sm line-clamp-3">{tweetPreview.text}</p>
                )}
                <div className="grid grid-cols-4 gap-3 pt-2">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatNumber(tweetPreview.views)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatNumber(tweetPreview.likes)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Repeat2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatNumber(tweetPreview.retweets)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatNumber(tweetPreview.replies)}</span>
                  </div>
                </div>

                {/* Tag Compliance */}
                {tagCompliance && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium mb-2">Tag Compliance</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tagCompliance.compliant ? (
                        <Badge className="bg-green-900/30 text-green-400 border-green-700" variant="outline">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          All tags found
                        </Badge>
                      ) : (
                        <Badge className="bg-red-900/30 text-red-400 border-red-700" variant="outline">
                          <XCircle className="h-3 w-3 mr-1" />
                          Missing tags
                        </Badge>
                      )}
                      {tagCompliance.found.map((tag) => (
                        <Badge key={tag} className="bg-green-900/20 text-green-400 border-green-800" variant="outline">
                          {tag}
                        </Badge>
                      ))}
                      {tagCompliance.missing.map((tag) => (
                        <Badge key={tag} className="bg-red-900/20 text-red-400 border-red-800" variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          After submitting, your clip will be reviewed by the team. Metrics are fetched automatically from the Twitter API.
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
        <Button
          type="submit"
          disabled={isLoading || campaigns.length === 0 || duplicateInfo?.isDuplicate || !campaignId || !platformPostUrl}
        >
          {isLoading ? 'Submitting...' : 'Submit Clip'}
        </Button>
      </div>
    </form>
  );
}
