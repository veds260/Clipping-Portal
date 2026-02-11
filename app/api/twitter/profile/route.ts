import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fetchTwitterProfileImage } from '@/lib/twitter-api';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const handle = request.nextUrl.searchParams.get('handle');
  const userId = request.nextUrl.searchParams.get('userId');

  if (!handle) {
    return NextResponse.json({ error: 'Handle parameter required' }, { status: 400 });
  }

  const avatarUrl = await fetchTwitterProfileImage(handle);

  if (!avatarUrl) {
    return NextResponse.json({ error: 'Could not fetch profile image' }, { status: 404 });
  }

  // If userId provided and caller is admin, update that user's record
  if (userId && session.user.role === 'admin') {
    await db.update(users).set({ avatarUrl, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  // If no userId, update the caller's own record
  if (!userId) {
    await db.update(users).set({ avatarUrl, updatedAt: new Date() }).where(eq(users.id, session.user.id));
  }

  return NextResponse.json({ avatarUrl });
}
