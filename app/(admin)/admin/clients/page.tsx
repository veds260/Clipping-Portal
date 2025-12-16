import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { clients, clips } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { ClientsTable } from './clients-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

async function getClients() {
  const allClients = await db.query.clients.findMany({
    orderBy: [desc(clients.createdAt)],
  });

  // Get clip counts for each client
  const clientsWithStats = await Promise.all(
    allClients.map(async (client) => {
      const clipStats = await db
        .select({
          count: sql<number>`count(*)`,
          totalViews: sql<number>`coalesce(sum(views), 0)`,
        })
        .from(clips)
        .where(eq(clips.clientId, client.id));

      return {
        ...client,
        clipsCount: clipStats[0]?.count || 0,
        totalViews: clipStats[0]?.totalViews || 0,
      };
    })
  );

  return clientsWithStats;
}

export default async function AdminClientsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const allClients = await getClients();

  const activeClients = allClients.filter(c => c.isActive);
  const totalBudget = allClients.reduce((sum, c) => sum + parseFloat(c.monthlyBudget || '0'), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            Manage brands and founders using your distribution network
          </p>
        </div>
        <Link href="/admin/clients/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Clients</p>
          <p className="text-2xl font-bold">{allClients.length}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Active Clients</p>
          <p className="text-2xl font-bold text-green-600">{activeClients.length}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Monthly Budget</p>
          <p className="text-2xl font-bold">${totalBudget.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Clips</p>
          <p className="text-2xl font-bold">{allClients.reduce((sum, c) => sum + c.clipsCount, 0)}</p>
        </div>
      </div>

      <ClientsTable clients={allClients} />
    </div>
  );
}
