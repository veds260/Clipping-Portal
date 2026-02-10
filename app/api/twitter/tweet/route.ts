import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fetchTweetByUrl, checkTagCompliance, parseTweetId } from '@/lib/twitter-api';
import { db } from '@/lib/db';
import { campaigns } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get('url');
  const campaignId = request.nextUrl.searchParams.get('campaignId');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  const tweetId = parseTweetId(url);
  if (!tweetId) {
    return NextResponse.json({ error: 'Invalid Twitter/X URL' }, { status: 400 });
  }

  const tweetData = await fetchTweetByUrl(url);
  if (!tweetData) {
    return NextResponse.json({ error: 'Failed to fetch tweet data' }, { status: 502 });
  }

  let tagCompliance = null;
  if (campaignId) {
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });

    if (campaign?.requiredTags && (campaign.requiredTags as string[]).length > 0) {
      tagCompliance = checkTagCompliance(
        tweetData.text,
        tweetData.entities,
        campaign.requiredTags as string[]
      );
    }
  }

  return NextResponse.json({
    tweet: tweetData,
    tagCompliance,
  });
}
