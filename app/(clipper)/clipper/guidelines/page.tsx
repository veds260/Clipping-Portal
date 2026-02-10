import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clipperProfiles, campaignClipperAssignments, campaigns, platformSettings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

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

export default async function GuidelinesPage() {
  const session = await auth();
  if (!session) redirect('/login');

  // Get clipper profile
  const profile = await db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.userId, session.user.id),
  });

  if (!profile) redirect('/login');

  // Get assigned campaigns with their guidelines
  const assignments = await db.query.campaignClipperAssignments.findMany({
    where: eq(campaignClipperAssignments.clipperId, profile.id),
    with: {
      campaign: true,
    },
  });

  const activeCampaigns = assignments.filter(a => a.campaign.status === 'active');

  // Get global content settings
  const contentSettings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'content_settings'),
  });

  const globalGuidelines = (contentSettings?.value as { content_guidelines?: string })?.content_guidelines || '';

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Guidelines</h1>
        <p className="text-muted-foreground">
          Content requirements and campaign-specific guidelines
        </p>
      </div>

      <div className="space-y-6">
        {/* Tier System Explanation */}
        <Card>
          <CardHeader>
            <CardTitle>How Payment Works</CardTitle>
            <CardDescription>Each campaign has its own tier-based rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <Badge className={tierColors.tier1} variant="outline">Tier 1</Badge>
                <h3 className="font-medium mt-2 mb-1 text-sm">CPM Based (Lower)</h3>
                <p className="text-sm text-muted-foreground">
                  Earn per 1,000 views at the campaign's Tier 1 CPM rate. Great for getting started.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <Badge className={tierColors.tier2} variant="outline">Tier 2</Badge>
                <h3 className="font-medium mt-2 mb-1 text-sm">CPM Based (Higher)</h3>
                <p className="text-sm text-muted-foreground">
                  Higher CPM rate per 1,000 views. Assigned to proven clippers with good track records.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <Badge className={tierColors.tier3} variant="outline">Tier 3</Badge>
                <h3 className="font-medium mt-2 mb-1 text-sm">Fixed Rate Per Clip</h3>
                <p className="text-sm text-muted-foreground">
                  Fixed payment per approved clip regardless of views. Reserved for top performers.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Admins assign your tier per campaign. Anti-gaming caps may limit max earnings per clip and per campaign.
            </p>
          </CardContent>
        </Card>

        {/* Campaign Guidelines */}
        {activeCampaigns.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Your Campaign Guidelines</CardTitle>
              <CardDescription>Specific requirements for campaigns you are assigned to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {activeCampaigns.map((assignment) => {
                const campaign = assignment.campaign;
                const tags = (campaign.requiredTags as string[]) || [];

                return (
                  <div key={assignment.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{campaign.name}</h3>
                      <Badge className={tierColors[assignment.assignedTier]} variant="outline">
                        {tierLabels[assignment.assignedTier]}
                      </Badge>
                    </div>

                    {campaign.description && (
                      <p className="text-sm text-muted-foreground">{campaign.description}</p>
                    )}

                    {/* Rate Info */}
                    <div className="text-sm">
                      <span className="font-medium">Your Rate: </span>
                      {assignment.assignedTier === 'tier3' ? (
                        <span className="text-primary">${parseFloat(campaign.tier3FixedRate || '0').toFixed(2)} per clip</span>
                      ) : assignment.assignedTier === 'tier2' ? (
                        <span className="text-primary">${parseFloat(campaign.tier2CpmRate || '0').toFixed(2)} per 1K views</span>
                      ) : (
                        <span className="text-primary">${parseFloat(campaign.tier1CpmRate || '0').toFixed(2)} per 1K views</span>
                      )}
                    </div>

                    {/* Required Tags */}
                    {tags.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Required Tags (include at least one):</p>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="font-mono text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Guidelines */}
                    {campaign.contentGuidelines && (
                      <div>
                        <p className="text-sm font-medium mb-1">Content Guidelines:</p>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {campaign.contentGuidelines}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>You are not assigned to any active campaigns yet.</p>
              <p className="text-sm mt-1">Admins will assign you when campaigns are available.</p>
            </CardContent>
          </Card>
        )}

        {/* Global Guidelines */}
        {globalGuidelines && (
          <Card>
            <CardHeader>
              <CardTitle>General Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap">{globalGuidelines}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
