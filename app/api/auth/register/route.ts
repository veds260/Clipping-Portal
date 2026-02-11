import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, clipperProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { fetchTwitterProfileImage } from '@/lib/twitter-api';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  twitterHandle: z.string().optional(),
  telegramHandle: z.string().optional(),
  walletAddress: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, twitterHandle, telegramHandle, walletAddress } = registerSchema.parse(body);

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      name,
      twitterHandle,
      role: 'clipper',
    }).returning();

    // Create clipper profile
    await db.insert(clipperProfiles).values({
      userId: newUser.id,
      telegramHandle,
      walletAddress,
      status: 'pending',
    });

    // Fetch Twitter avatar in background (non-blocking)
    if (twitterHandle) {
      fetchTwitterProfileImage(twitterHandle)
        .then(async (avatarUrl) => {
          if (avatarUrl) {
            await db
              .update(users)
              .set({ avatarUrl, updatedAt: new Date() })
              .where(eq(users.id, newUser.id));
          }
        })
        .catch((err) => console.error('Failed to fetch avatar:', err));
    }

    return NextResponse.json({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
