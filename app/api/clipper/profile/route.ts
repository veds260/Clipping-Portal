import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { clipperProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await db.query.clipperProfiles.findFirst({
      where: eq(clipperProfiles.userId, session.user.id),
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        telegramHandle: profile.telegramHandle,
        walletAddress: profile.walletAddress,
        tier: profile.tier,
        status: profile.status,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { telegramHandle, walletAddress } = body;

    const profile = await db.query.clipperProfiles.findFirst({
      where: eq(clipperProfiles.userId, session.user.id),
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    await db
      .update(clipperProfiles)
      .set({
        telegramHandle,
        walletAddress,
        updatedAt: new Date(),
      })
      .where(eq(clipperProfiles.id, profile.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
