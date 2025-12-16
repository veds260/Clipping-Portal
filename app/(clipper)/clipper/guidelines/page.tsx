import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { platformSettings, clipperProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

async function getGuidelines() {
  const contentSettings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'content_settings'),
  });

  const payoutSettings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'payout_settings'),
  });

  const tierSettings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'tier_settings'),
  });

  return {
    content: contentSettings?.value as {
      minimum_clip_duration: number;
      maximum_clip_duration: number;
      content_guidelines: string;
    } || {
      minimum_clip_duration: 7,
      maximum_clip_duration: 90,
      content_guidelines: '',
    },
    payout: payoutSettings?.value as {
      minimum_views_for_payout: number;
      bonus_threshold_views: number;
      bonus_multiplier: number;
    } || {
      minimum_views_for_payout: 1000,
      bonus_threshold_views: 100000,
      bonus_multiplier: 1.5,
    },
    tier: tierSettings?.value as {
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
    } || {
      tier_approved_min_clips: 10,
      tier_core_min_views: 500000,
      tier_core_min_clips: 50,
      tier_approved_min_avg_views: 1000,
      tier_core_min_avg_views: 5000,
      entry_benefits: '',
      approved_benefits: '',
      core_benefits: '',
      entry_pay_rate: 1.0,
      approved_pay_rate: 1.5,
      core_pay_rate: 2.0,
    },
  };
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(0) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return num.toString();
}

async function getClipperTier(userId: string): Promise<string> {
  const profile = await db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.userId, userId),
  });
  return profile?.tier || 'entry';
}

export default async function GuidelinesPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const settings = await getGuidelines();
  const clipperTier = await getClipperTier(session.user.id);

  // Get the clipper's current pay rate based on their tier
  const currentPayRate = clipperTier === 'core'
    ? settings.tier.core_pay_rate
    : clipperTier === 'approved'
      ? settings.tier.approved_pay_rate
      : settings.tier.entry_pay_rate;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Guidelines</h1>
        <p className="text-muted-foreground">
          Content requirements and best practices
        </p>
      </div>

      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{settings.content.minimum_clip_duration}-{settings.content.maximum_clip_duration}s</div>
              <p className="text-xs text-muted-foreground">Clip Duration</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{formatNumber(settings.payout.minimum_views_for_payout)}</div>
              <p className="text-xs text-muted-foreground">Min Views</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">${(currentPayRate || 1).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Your Rate/1K Views</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{formatNumber(settings.payout.bonus_threshold_views)}+</div>
              <p className="text-xs text-muted-foreground">Viral Bonus Threshold</p>
            </CardContent>
          </Card>
        </div>

        {/* Tier System */}
        <Card>
          <CardHeader>
            <CardTitle>Tier System</CardTitle>
            <CardDescription>Progress through tiers to unlock better pay and opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Entry Tier */}
              <div className="p-4 border rounded-lg">
                <Badge className="bg-gray-100 text-gray-800 mb-2">Entry</Badge>
                <div className="text-lg font-bold text-green-600 mb-2">
                  ${settings.tier.entry_pay_rate?.toFixed(2) || '1.00'}/1K views
                </div>
                <h3 className="font-medium mb-2 text-sm">Starting Point</h3>
                {settings.tier.entry_benefits ? (
                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {settings.tier.entry_benefits}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Build your track record</p>
                )}
              </div>

              {/* Approved Tier */}
              <div className="p-4 border rounded-lg border-blue-200 bg-blue-50/30">
                <Badge className="bg-blue-100 text-blue-800 mb-2">Approved</Badge>
                <div className="text-lg font-bold text-green-600 mb-2">
                  ${settings.tier.approved_pay_rate?.toFixed(2) || '1.50'}/1K views
                </div>
                <h3 className="font-medium mb-2 text-sm">Requirements</h3>
                <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                  <li>• {settings.tier.tier_approved_min_clips}+ approved clips</li>
                  <li>• {formatNumber(settings.tier.tier_approved_min_avg_views)}+ avg views/clip</li>
                </ul>
                {settings.tier.approved_benefits && (
                  <>
                    <h3 className="font-medium mb-1 text-sm">Benefits</h3>
                    <div className="text-sm text-muted-foreground whitespace-pre-line">
                      {settings.tier.approved_benefits}
                    </div>
                  </>
                )}
              </div>

              {/* Core Tier */}
              <div className="p-4 border rounded-lg border-purple-200 bg-purple-50/30">
                <Badge className="bg-purple-100 text-purple-800 mb-2">Core</Badge>
                <div className="text-lg font-bold text-green-600 mb-2">
                  ${settings.tier.core_pay_rate?.toFixed(2) || '2.00'}/1K views
                </div>
                <h3 className="font-medium mb-2 text-sm">Requirements</h3>
                <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                  <li>• {formatNumber(settings.tier.tier_core_min_views)}+ total views</li>
                  <li>• {settings.tier.tier_core_min_clips}+ approved clips</li>
                  <li>• {formatNumber(settings.tier.tier_core_min_avg_views)}+ avg views/clip</li>
                </ul>
                {settings.tier.core_benefits && (
                  <>
                    <h3 className="font-medium mb-1 text-sm">Benefits</h3>
                    <div className="text-sm text-muted-foreground whitespace-pre-line">
                      {settings.tier.core_benefits}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guidelines Content */}
        {settings.content.content_guidelines && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap">{settings.content.content_guidelines}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
