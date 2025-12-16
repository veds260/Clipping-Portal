import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

// Cache for 30 seconds
export const revalidate = 30;

import { clipperProfiles } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { ClippersTable } from './clippers-table';

async function getClippers() {
  const allClippers = await db.query.clipperProfiles.findMany({
    orderBy: [desc(clipperProfiles.createdAt)],
    with: {
      user: true,
    },
  });

  return allClippers;
}

export default async function AdminClippersPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const clippers = await getClippers();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Clippers</h1>
        <p className="text-muted-foreground">
          Manage clippers, change tiers, and view performance
        </p>
      </div>

      <ClippersTable clippers={clippers} />
    </div>
  );
}
