import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { platformSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SettingsForm } from './settings-form';

async function getAllSettings() {
  const payoutSettings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'payout_settings'),
  });

  const contentSettings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'content_settings'),
  });

  const tierSettings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'tier_settings'),
  });

  return {
    payout: payoutSettings?.value as {
      minimum_views_for_payout: number;
      bonus_threshold_views: number;
      bonus_multiplier: number;
    } || {
      minimum_views_for_payout: 1000,
      bonus_threshold_views: 100000,
      bonus_multiplier: 1.5,
    },
    content: contentSettings?.value as {
      minimum_clip_duration: number;
      maximum_clip_duration: number;
      content_guidelines: string;
    } || {
      minimum_clip_duration: 7,
      maximum_clip_duration: 90,
      content_guidelines: '',
    },
    tier: tierSettings?.value as {
      tier_approved_min_clips: number;
      tier_core_min_views: number;
      tier_core_min_clips: number;
      tier_approved_min_avg_views: number;
      tier_core_min_avg_views: number;
      entry_benefits: string;
      approved_benefits: string;
      core_benefits: string;
      entry_pay_rate: number;
      approved_pay_rate: number;
      core_pay_rate: number;
    } || {
      tier_approved_min_clips: 10,
      tier_core_min_views: 500000,
      tier_core_min_clips: 50,
      tier_approved_min_avg_views: 1000,
      tier_core_min_avg_views: 5000,
      entry_benefits: '',
      approved_benefits: '',
      core_benefits: '',
      entry_pay_rate: 1.0,
      approved_pay_rate: 1.5,
      core_pay_rate: 2.0,
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
          Configure pay rates, content requirements, and tier thresholds
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
