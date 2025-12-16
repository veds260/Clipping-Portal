import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ClientForm } from '../client-form';

export const dynamic = 'force-dynamic';

export default async function NewClientPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add Client</h1>
        <p className="text-muted-foreground">
          Add a new brand or founder to your distribution network
        </p>
      </div>

      <ClientForm />
    </div>
  );
}
