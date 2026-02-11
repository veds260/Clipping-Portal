import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { payoutBatches, clipperPayouts } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { PayoutsManager } from './payouts-manager';

async function getBatches() {
  const batches = await db.query.payoutBatches.findMany({
    orderBy: [desc(payoutBatches.createdAt)],
    with: {
      clipperPayouts: {
        with: {
          clipper: {
            with: {
              user: true,
            },
          },
        },
      },
    },
  });

  return batches;
}

export default async function AdminPayoutsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const batches = await getBatches();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Payouts</h1>
        <p className="text-muted-foreground">
          Generate payout batches and track payment status
        </p>
      </div>

      <PayoutsManager batches={batches} />
    </div>
  );
}
