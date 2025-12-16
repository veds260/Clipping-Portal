import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { clipperProfiles, clips } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ClipperClipsView } from './clips-view';

async function getClipperClips(userId: string) {
  const profile = await db.query.clipperProfiles.findFirst({
    where: eq(clipperProfiles.userId, userId),
  });

  if (!profile) return [];

  const clipperClips = await db.query.clips.findMany({
    where: eq(clips.clipperId, profile.id),
    orderBy: [desc(clips.createdAt)],
  });

  return clipperClips;
}

export default async function ClipperClipsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const clipperClips = await getClipperClips(session.user.id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Clips</h1>
        <p className="text-muted-foreground">
          View and manage your submitted clips
        </p>
      </div>

      <ClipperClipsView clips={clipperClips} />
    </div>
  );
}
