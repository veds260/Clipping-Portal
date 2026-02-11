import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clipperProfiles, campaignClipperAssignments, campaigns, platformSettings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

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
        {/* How Payment Works */}
        <Card>
          <CardHeader>
            <CardTitle>How Payment Works</CardTitle>
            <CardDescription>Your earnings are based on your performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Earnings are calculated based on how your clips perform. Better performing clips and consistent quality lead to better rates over time.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium text-sm mb-1">Views-Based Earnings</h3>
                <p className="text-sm text-muted-foreground">
                  Most clips earn based on the number of views they get. The more views, the more you earn.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium text-sm mb-1">Performance Growth</h3>
                <p className="text-sm text-muted-foreground">
                  As you prove yourself with quality clips and consistent results, your earning potential increases.
                </p>
              </div>
            </div>
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
