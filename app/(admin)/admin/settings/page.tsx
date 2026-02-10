import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { platformSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';

async function getAllSettings() {
  const payoutSettings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'payout_settings'),
  });

  const contentSettings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'content_settings'),
  });

  return {
    payout: payoutSettings?.value as {
      minimum_views_for_payout: number;
    } || {
      minimum_views_for_payout: 1000,
    },
    content: contentSettings?.value as {
      content_guidelines: string;
    } || {
      content_guidelines: '',
    },
  };
}

export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const settings = await getAllSettings();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure payout rules and content guidelines. Tier rates are set per-campaign.
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
