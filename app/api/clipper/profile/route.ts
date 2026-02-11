import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { clipperProfiles, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { validateWalletAddress } from '@/lib/wallet-validation';

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

    // Get avatarUrl from users table
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { avatarUrl: true },
    });

    return NextResponse.json({
      profile: {
        telegramHandle: profile.telegramHandle,
        walletAddress: profile.walletAddress,
        walletType: profile.walletType,
        tier: profile.tier,
        status: profile.status,
        avatarUrl: user?.avatarUrl || null,
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
    const { telegramHandle, walletAddress, walletType } = body;

    // Validate wallet address format
    if (walletAddress && walletType) {
      const walletError = validateWalletAddress(walletType, walletAddress);
      if (walletError) {
        return NextResponse.json({ error: walletError }, { status: 400 });
      }
    }

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
        walletType,
        updatedAt: new Date(),
      })
      .where(eq(clipperProfiles.id, profile.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
