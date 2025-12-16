import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ClientForm } from '../client-form';

export const dynamic = 'force-dynamic';

async function getClient(id: string) {
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, id),
    columns: {
      id: true,
      name: true,
      brandName: true,
      twitterHandle: true,
      logoUrl: true,
      monthlyBudget: true,
      payRatePer1k: true,
      contentGuidelines: true,
      isActive: true,
      userId: true,
    },
  });
  return client;
}

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Client</h1>
        <p className="text-muted-foreground">
          Update {client.name}'s settings
        </p>
      </div>

      <ClientForm client={client} />
    </div>
  );
}
