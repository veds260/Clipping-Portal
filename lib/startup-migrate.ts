import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export async function runStartupMigrations() {
  try {
    console.log('[startup-migrate] Running startup migrations...');

    // Add wallet_type column if missing
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE clipper_profiles ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Add notion_url column if missing
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS notion_url TEXT;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Add max_clips_per_clipper column if missing
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_clips_per_clipper INTEGER DEFAULT 0;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Ensure 'unassigned' tier enum value exists
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TYPE clipper_tier ADD VALUE IF NOT EXISTS 'unassigned';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    console.log('[startup-migrate] Migrations complete.');
  } catch (error) {
    console.error('[startup-migrate] Migration error (non-fatal):', error);
  }
}
