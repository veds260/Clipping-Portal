import { config } from 'dotenv';
config({ path: '.env.local' });

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });

async function migrate() {
  console.log('Starting migration...');

  // Helper to check if a column exists
  async function columnExists(table: string, column: string): Promise<boolean> {
    const result = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = ${table} AND column_name = ${column}
    `;
    return result.length > 0;
  }

  // Helper to check if a table exists
  async function tableExists(table: string): Promise<boolean> {
    const result = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = ${table} AND table_schema = 'public'
    `;
    return result.length > 0;
  }

  // Helper to check if an enum value exists
  async function enumValueExists(enumName: string, value: string): Promise<boolean> {
    const result = await sql`
      SELECT 1 FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = ${enumName} AND pg_enum.enumlabel = ${value}
    `;
    return result.length > 0;
  }

  // Helper to check if an index exists
  async function indexExists(indexName: string): Promise<boolean> {
    const result = await sql`
      SELECT 1 FROM pg_indexes
      WHERE indexname = ${indexName}
    `;
    return result.length > 0;
  }

  // ============================================================
  // 1. Update enums: add new tier values if missing
  // ============================================================
  console.log('Updating enums...');

  for (const val of ['unassigned', 'tier1', 'tier2', 'tier3']) {
    if (!(await enumValueExists('clipper_tier', val))) {
      await sql.unsafe(`ALTER TYPE clipper_tier ADD VALUE IF NOT EXISTS '${val}'`);
      console.log(`  Added '${val}' to clipper_tier enum`);
    }
  }

  // ============================================================
  // 2. Drop old tables (clients, distribution_channels)
  // ============================================================
  console.log('Dropping old tables...');

  if (await tableExists('distribution_channels')) {
    await sql`DROP TABLE distribution_channels CASCADE`;
    console.log('  Dropped distribution_channels');
  }

  if (await tableExists('clients')) {
    await sql`DROP TABLE clients CASCADE`;
    console.log('  Dropped clients');
  }

  // ============================================================
  // 3. Add new columns to campaigns
  // ============================================================
  console.log('Updating campaigns table...');

  const campaignNewCols: [string, string][] = [
    ['brand_name', 'VARCHAR(255)'],
    ['brand_logo_url', 'TEXT'],
    ['tier1_cpm_rate', 'DECIMAL(5,2) DEFAULT 0'],
    ['tier2_cpm_rate', 'DECIMAL(5,2) DEFAULT 0'],
    ['tier3_fixed_rate', 'DECIMAL(10,2) DEFAULT 0'],
    ['tier1_max_per_clip', 'DECIMAL(10,2)'],
    ['tier2_max_per_clip', 'DECIMAL(10,2)'],
    ['tier1_max_per_campaign', 'DECIMAL(10,2)'],
    ['tier2_max_per_campaign', 'DECIMAL(10,2)'],
    ['tier3_max_per_campaign', 'DECIMAL(10,2)'],
    ['required_tags', "JSONB DEFAULT '[]'::jsonb"],
    ['content_guidelines', 'TEXT'],
    ['notion_url', 'TEXT'],
  ];

  for (const [col, type] of campaignNewCols) {
    if (!(await columnExists('campaigns', col))) {
      await sql.unsafe(`ALTER TABLE campaigns ADD COLUMN ${col} ${type}`);
      console.log(`  Added campaigns.${col}`);
    }
  }

  // Drop old campaign columns
  const campaignOldCols = ['client_id', 'pay_rate_per_1k', 'tier_requirement', 'source_content_type', 'source_content_url'];
  for (const col of campaignOldCols) {
    if (await columnExists('campaigns', col)) {
      await sql.unsafe(`ALTER TABLE campaigns DROP COLUMN ${col} CASCADE`);
      console.log(`  Dropped campaigns.${col}`);
    }
  }

  // ============================================================
  // 4. Add new columns to clips
  // ============================================================
  console.log('Updating clips table...');

  const clipsNewCols: [string, string][] = [
    ['tweet_id', 'VARCHAR(255)'],
    ['tweet_text', 'TEXT'],
    ['author_username', 'VARCHAR(255)'],
    ['retweets', 'INTEGER DEFAULT 0'],
    ['impressions', 'INTEGER DEFAULT 0'],
    ['metrics_updated_at', 'TIMESTAMP'],
    ['tag_compliance', 'JSONB'],
  ];

  for (const [col, type] of clipsNewCols) {
    if (!(await columnExists('clips', col))) {
      await sql.unsafe(`ALTER TABLE clips ADD COLUMN ${col} ${type}`);
      console.log(`  Added clips.${col}`);
    }
  }

  // Drop old clip columns
  const clipsOldCols = [
    'client_id', 'channel_id', 'is_filler_content', 'source_creator',
    'hook', 'title', 'description', 'duration_seconds',
    'thumbnail_url', 'metrics_screenshot_url',
  ];
  for (const col of clipsOldCols) {
    if (await columnExists('clips', col)) {
      await sql.unsafe(`ALTER TABLE clips DROP COLUMN ${col} CASCADE`);
      console.log(`  Dropped clips.${col}`);
    }
  }

  // ============================================================
  // 5. Add campaign_id to clipper_payouts
  // ============================================================
  console.log('Updating clipper_payouts table...');

  if (!(await columnExists('clipper_payouts', 'campaign_id'))) {
    await sql`ALTER TABLE clipper_payouts ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL`;
    console.log('  Added clipper_payouts.campaign_id');
  }

  // ============================================================
  // 6. Create campaign_clipper_assignments table
  // ============================================================
  console.log('Creating campaign_clipper_assignments table...');

  if (!(await tableExists('campaign_clipper_assignments'))) {
    await sql`
      CREATE TABLE campaign_clipper_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        clipper_id UUID NOT NULL REFERENCES clipper_profiles(id) ON DELETE CASCADE,
        assigned_tier clipper_tier NOT NULL,
        total_earned_in_campaign DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('  Created campaign_clipper_assignments table');
  }

  // ============================================================
  // 7. Create indexes
  // ============================================================
  console.log('Creating indexes...');

  const indexes: [string, string][] = [
    ['idx_assignment_campaign_clipper', 'CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_campaign_clipper ON campaign_clipper_assignments(campaign_id, clipper_id)'],
    ['idx_assignments_campaign', 'CREATE INDEX IF NOT EXISTS idx_assignments_campaign ON campaign_clipper_assignments(campaign_id)'],
    ['idx_assignments_clipper', 'CREATE INDEX IF NOT EXISTS idx_assignments_clipper ON campaign_clipper_assignments(clipper_id)'],
    ['idx_clips_tweet_id', 'CREATE INDEX IF NOT EXISTS idx_clips_tweet_id ON clips(tweet_id)'],
    ['idx_clips_status_created', 'CREATE INDEX IF NOT EXISTS idx_clips_status_created ON clips(status, created_at)'],
    ['idx_clips_clipper_status', 'CREATE INDEX IF NOT EXISTS idx_clips_clipper_status ON clips(clipper_id, status)'],
    ['idx_clipper_payouts_campaign', 'CREATE INDEX IF NOT EXISTS idx_clipper_payouts_campaign ON clipper_payouts(campaign_id)'],
    ['idx_users_role', 'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)'],
    ['idx_users_created_at', 'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)'],
    ['idx_clipper_profiles_user', 'CREATE INDEX IF NOT EXISTS idx_clipper_profiles_user ON clipper_profiles(user_id)'],
    ['idx_clipper_profiles_status', 'CREATE INDEX IF NOT EXISTS idx_clipper_profiles_status ON clipper_profiles(status)'],
    ['idx_clipper_profiles_tier', 'CREATE INDEX IF NOT EXISTS idx_clipper_profiles_tier ON clipper_profiles(tier)'],
    ['idx_campaigns_status', 'CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)'],
    ['idx_clips_clipper', 'CREATE INDEX IF NOT EXISTS idx_clips_clipper ON clips(clipper_id)'],
    ['idx_clips_campaign', 'CREATE INDEX IF NOT EXISTS idx_clips_campaign ON clips(campaign_id)'],
    ['idx_clips_status', 'CREATE INDEX IF NOT EXISTS idx_clips_status ON clips(status)'],
    ['idx_clips_platform_url', 'CREATE INDEX IF NOT EXISTS idx_clips_platform_url ON clips(platform_post_url)'],
  ];

  for (const [name, ddl] of indexes) {
    if (!(await indexExists(name))) {
      await sql.unsafe(ddl);
      console.log(`  Created index ${name}`);
    }
  }

  // ============================================================
  // 8. Update existing clipper_profiles tier values
  // ============================================================
  console.log('Updating existing tier values...');

  await sql`UPDATE clipper_profiles SET tier = 'tier1' WHERE tier = 'entry'`;
  await sql`UPDATE clipper_profiles SET tier = 'tier2' WHERE tier = 'approved'`;
  await sql`UPDATE clipper_profiles SET tier = 'tier3' WHERE tier = 'core'`;
  console.log('  Updated clipper tier values');

  // ============================================================
  // 9. Add wallet_address column to clipper_profiles
  // ============================================================
  console.log('Adding wallet_address column...');

  if (!(await columnExists('clipper_profiles', 'wallet_address'))) {
    await sql.unsafe(`ALTER TABLE clipper_profiles ADD COLUMN wallet_address VARCHAR(255)`);
    console.log('  Added clipper_profiles.wallet_address');
  }

  if (!(await columnExists('clipper_profiles', 'wallet_type'))) {
    await sql.unsafe(`ALTER TABLE clipper_profiles ADD COLUMN wallet_type VARCHAR(20)`);
    console.log('  Added clipper_profiles.wallet_type');
  }

  // Set default tier to unassigned for new clippers
  await sql.unsafe(`ALTER TABLE clipper_profiles ALTER COLUMN tier SET DEFAULT 'unassigned'`);
  console.log('  Updated default tier to unassigned');

  console.log('Migration completed successfully!');
  await sql.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
