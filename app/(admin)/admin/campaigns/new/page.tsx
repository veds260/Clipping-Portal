import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { CampaignForm } from '../campaign-form';

export const dynamic = 'force-dynamic';

async function getActiveClients() {
  return db.query.clients.findMany({
    where: eq(clients.isActive, true),
    columns: {
      id: true,
      name: true,
      brandName: true,
    },
  });
}

export default async function NewCampaignPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const activeClients = await getActiveClients();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Campaign</h1>
        <p className="text-muted-foreground">
          Create a new campaign for a client
        </p>
      </div>

      <CampaignForm clients={activeClients} />
    </div>
  );
}
