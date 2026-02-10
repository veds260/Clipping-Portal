import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CampaignForm } from '../campaign-form';

export const dynamic = 'force-dynamic';

export default async function NewCampaignPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Campaign</h1>
        <p className="text-muted-foreground">
          Create a new campaign
        </p>
      </div>

      <CampaignForm />
    </div>
  );
}
