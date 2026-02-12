import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fetchClipperDemographics, fetchAllClipCommenterDemographics } from '@/lib/actions/demographics';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clipperResult = await fetchClipperDemographics();
  const commenterResult = await fetchAllClipCommenterDemographics();

  return NextResponse.json({
    success: true,
    clippers: clipperResult,
    commenters: commenterResult,
  });
}
