import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { clips, clipperProfiles, users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { ClipsTable } from './clips-table';

async function getClips() {
  const allClips = await db.query.clips.findMany({
    orderBy: [desc(clips.createdAt)],
    with: {
      clipper: {
        with: {
          user: true,
        },
      },
    },
  });

  return allClips;
}

export default async function AdminClipsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const allClips = await getClips();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Clips</h1>
        <p className="text-muted-foreground">
          Review, approve, and manage submitted clips
        </p>
      </div>

      <ClipsTable clips={allClips} />
    </div>
  );
}
