import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ChannelForm } from '../channel-form';

export const dynamic = 'force-dynamic';

export default async function NewChannelPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add Distribution Channel</h1>
        <p className="text-muted-foreground">
          Create a new channel in your owned distribution network
        </p>
      </div>

      <ChannelForm />
    </div>
  );
}
