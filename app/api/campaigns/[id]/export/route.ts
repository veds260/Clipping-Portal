import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clips, clipperProfiles, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get all clips for this campaign
    const campaignClips = await db
      .select({
        platformPostUrl: clips.platformPostUrl,
        impressions: clips.impressions,
        views: clips.views,
        status: clips.status,
        clipperName: users.name,
        authorUsername: clips.authorUsername,
        postedAt: clips.postedAt,
        tweetText: clips.tweetText,
        likes: clips.likes,
        comments: clips.comments,
        shares: clips.shares,
        payoutAmount: clips.payoutAmount,
      })
      .from(clips)
      .leftJoin(clipperProfiles, eq(clips.clipperId, clipperProfiles.id))
      .leftJoin(users, eq(clipperProfiles.userId, users.id))
      .where(eq(clips.campaignId, id))
      .orderBy(desc(clips.postedAt));

    // Generate CSV content
    const headers = [
      'Submission URL',
      'Impressions',
      'Views',
      'Status',
      'Clipper Name',
      'Author Username',
      'Posted At',
      'Tweet Text',
      'Likes',
      'Comments',
      'Shares',
      'Payout Amount',
    ];

    const rows = campaignClips.map((clip) => [
      clip.platformPostUrl || '',
      clip.impressions || clip.views || 0,
      clip.views || 0,
      clip.status || 'pending',
      clip.clipperName || clip.authorUsername || 'Unknown',
      clip.authorUsername || '',
      clip.postedAt ? new Date(clip.postedAt).toISOString() : '',
      clip.tweetText ? `"${clip.tweetText.replace(/"/g, '""')}"` : '',
      clip.likes || 0,
      clip.comments || 0,
      clip.shares || 0,
      clip.payoutAmount || 0,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="campaign-${id}-submissions.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting campaign clips:', error);
    return NextResponse.json({ error: 'Failed to export clips' }, { status: 500 });
  }
}
