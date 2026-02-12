'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { clipperProfiles, clips, users } from '@/lib/db/schema';
import { eq, isNotNull, isNull, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { fetchTwitterUserLocation, fetchTweetCommenterLocations } from '@/lib/twitter-api';
import { normalizeLocationCounts } from '@/lib/location-normalizer';

/**
 * Fetch location data for all clippers with Twitter handles.
 * Updates clipperProfiles.location from their Twitter profile.
 */
export async function fetchClipperDemographics() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    // Get all clippers with Twitter handles
    const clippersWithHandles = await db
      .select({
        clipperId: clipperProfiles.id,
        twitterHandle: users.twitterHandle,
      })
      .from(clipperProfiles)
      .innerJoin(users, eq(clipperProfiles.userId, users.id))
      .where(isNotNull(users.twitterHandle));

    let updated = 0;
    let failed = 0;

    for (const clipper of clippersWithHandles) {
      if (!clipper.twitterHandle) continue;

      try {
        const location = await fetchTwitterUserLocation(clipper.twitterHandle);

        await db
          .update(clipperProfiles)
          .set({
            location: location || null,
            demographicsUpdatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(clipperProfiles.id, clipper.clipperId));

        updated++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch {
        failed++;
      }
    }

    revalidatePath('/admin/clippers');
    return { success: true, total: clippersWithHandles.length, updated, failed };
  } catch (error) {
    console.error('[demographics] clipper fetch error:', error);
    return { error: 'Failed to fetch clipper demographics' };
  }
}

/**
 * Fetch commenter demographics for a single clip.
 */
export async function fetchClipCommenterDemographics(clipId: string) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId),
    });

    if (!clip || !clip.tweetId) {
      return { error: 'Clip not found or no tweet ID' };
    }

    const result = await fetchTweetCommenterLocations(clip.tweetId);
    const normalizedLocations = normalizeLocationCounts(result.locations);

    await db
      .update(clips)
      .set({
        commenterDemographics: {
          locations: normalizedLocations,
          totalFetched: result.totalFetched,
          fetchedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(clips.id, clipId));

    revalidatePath('/admin/clips');
    return { success: true, locations: normalizedLocations, totalFetched: result.totalFetched };
  } catch (error) {
    console.error('[demographics] clip commenter fetch error:', error);
    return { error: 'Failed to fetch commenter demographics' };
  }
}

/**
 * Fetch commenter demographics for all clips that don't have it yet.
 */
export async function fetchAllClipCommenterDemographics() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    // Get clips with tweet IDs that don't have demographics yet
    const clipsToFetch = await db
      .select({ id: clips.id, tweetId: clips.tweetId })
      .from(clips)
      .where(
        and(
          isNotNull(clips.tweetId),
          isNull(clips.commenterDemographics),
          sql`${clips.status} IN ('approved', 'paid')`
        )
      );

    let updated = 0;
    let failed = 0;

    for (const clip of clipsToFetch) {
      if (!clip.tweetId) continue;

      try {
        const result = await fetchTweetCommenterLocations(clip.tweetId);
        const normalizedLocations = normalizeLocationCounts(result.locations);

        await db
          .update(clips)
          .set({
            commenterDemographics: {
              locations: normalizedLocations,
              totalFetched: result.totalFetched,
              fetchedAt: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(clips.id, clip.id));

        updated++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch {
        failed++;
      }
    }

    revalidatePath('/admin/clips');
    revalidatePath('/admin/clippers');
    return { success: true, total: clipsToFetch.length, updated, failed };
  } catch (error) {
    console.error('[demographics] all clips fetch error:', error);
    return { error: 'Failed to fetch commenter demographics' };
  }
}
