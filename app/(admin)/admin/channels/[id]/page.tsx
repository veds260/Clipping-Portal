import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { distributionChannels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ChannelForm } from '../channel-form';

export const dynamic = 'force-dynamic';

async function getChannel(id: string) {
  const channel = await db.query.distributionChannels.findFirst({
    where: eq(distributionChannels.id, id),
  });
  return channel;
}

export default async function EditChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const { id } = await params;
  const channel = await getChannel(id);

  if (!channel) {
    notFound();
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Channel</h1>
        <p className="text-muted-foreground">
          Update {channel.name} channel settings
        </p>
      </div>

      <ChannelForm channel={channel} />
    </div>
  );
}
