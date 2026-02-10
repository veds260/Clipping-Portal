import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clips, campaigns } from '@/lib/db/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';
import { fetchTweetById, checkTagCompliance } from '@/lib/twitter-api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Protect with cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get all clips from active campaigns that need refreshing
  const staleClips = await db
    .select({
      clipId: clips.id,
      tweetId: clips.tweetId,
      campaignId: clips.campaignId,
      status: clips.status,
    })
    .from(clips)
    .innerJoin(campaigns, eq(clips.campaignId, campaigns.id))
    .where(
      and(
        eq(campaigns.status, 'active'),
        isNotNull(clips.tweetId),
        sql`(${clips.metricsUpdatedAt} IS NULL OR ${clips.metricsUpdatedAt} < ${twentyFourHoursAgo})`,
        sql`${clips.status} IN ('pending', 'approved')`
      )
    );

  let updated = 0;
  let errors = 0;

  for (const clip of staleClips) {
    if (!clip.tweetId) continue;

    try {
      const tweetData = await fetchTweetById(clip.tweetId);
      if (!tweetData) {
        errors++;
        continue;
      }

      // Get campaign for tag compliance check
      let tagCompliance = null;
      if (clip.campaignId) {
        const campaign = await db.query.campaigns.findFirst({
          where: eq(campaigns.id, clip.campaignId),
        });
        if (campaign?.requiredTags && (campaign.requiredTags as string[]).length > 0) {
          tagCompliance = checkTagCompliance(
            tweetData.text,
            tweetData.entities,
            campaign.requiredTags as string[]
          );
        }
      }

      await db.update(clips)
        .set({
          views: tweetData.views,
          likes: tweetData.likes,
          retweets: tweetData.retweets,
          comments: tweetData.replies,
          impressions: tweetData.impressions,
          tweetText: tweetData.text,
          tagCompliance,
          metricsUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(clips.id, clip.clipId));

      updated++;

      // Rate limiting: small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Failed to refresh clip ${clip.clipId}:`, error);
      errors++;
    }
  }

  return NextResponse.json({
    total: staleClips.length,
    updated,
    errors,
    timestamp: new Date().toISOString(),
  });
}
