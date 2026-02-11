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

                    {/* Notion Page Link */}
                    {campaign.notionUrl && (
                      <div>
                        <a
                          href={campaign.notionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.79 2.46c-.466-.373-.84-.186-1.399.046L4.645 3.602c-.466.093-.56.28-.28.466l.094.14zm.793 1.679v13.87c0 .746.373 1.026 1.213.98l14.523-.84c.84-.046.933-.56.933-1.166V4.954c0-.606-.233-.933-.746-.886l-15.177.886c-.56.047-.746.327-.746.933zm14.337.746c.093.42 0 .84-.42.886l-.7.14v10.264c-.607.327-1.166.514-1.633.514-.746 0-.933-.234-1.493-.934l-4.577-7.186v6.952l1.446.327s0 .84-1.166.84l-3.22.187c-.093-.187 0-.654.327-.747l.84-.22V8.781l-1.166-.093c-.093-.42.14-1.026.793-1.073l3.453-.234 4.763 7.28V8.36l-1.213-.14c-.093-.514.28-.886.746-.933l3.22-.187z"/></svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Campaign Brief</p>
                            <p className="text-xs text-muted-foreground">View full brief on Notion</p>
                          </div>
                          <svg className="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
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
