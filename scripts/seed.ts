import { config } from 'dotenv';
config({ path: '.env.local' });

async function seed() {
  const { db } = await import('../lib/db');
  const { users, clipperProfiles, campaigns, campaignClipperAssignments, platformSettings } = await import('../lib/db/schema');
  const bcrypt = await import('bcryptjs');
  const { eq } = await import('drizzle-orm');

  console.log('Starting seed...');

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@web3clipping.com';
  const adminPasswordRaw = process.env.ADMIN_PASSWORD || 'admin123';
  const adminPassword = await bcrypt.hash(adminPasswordRaw, 12);

  const existingAdmin = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, adminEmail),
  });

  if (!existingAdmin) {
    await db.insert(users).values({
      email: adminEmail,
      passwordHash: adminPassword,
      name: 'Admin',
      role: 'admin',
    });
    console.log(`Created admin user: ${adminEmail}`);
  } else {
    console.log('Admin user already exists');
  }

  // Create Gacha Game Campaign
  const existingCampaign = await db.query.campaigns.findFirst({
    where: (campaigns, { eq }) => eq(campaigns.name, 'Gacha Game Campaign'),
  });

  let campaignId: string;

  if (!existingCampaign) {
    const [campaign] = await db.insert(campaigns).values({
      name: 'Gacha Game Campaign',
      description: 'Promote Gacha Game across Twitter/X with verified clips. Create engaging content about gameplay, pulls, and community moments.',
      brandName: 'Gacha Game',
      status: 'active',
      tier1CpmRate: '3.00',
      tier2CpmRate: '5.00',
      tier3FixedRate: '50.00',
      tier1MaxPerClip: '20.00',
      tier2MaxPerClip: '50.00',
      tier1MaxPerCampaign: '200.00',
      tier2MaxPerCampaign: '500.00',
      tier3MaxPerCampaign: '1000.00',
      requiredTags: [
        '@gacha_game_',
        'gacha_game_',
        'pull.gacha.game',
        'gacha.game',
        '#gacha',
      ],
      contentGuidelines: 'Create engaging clips about Gacha Game. Must include at least one tag/mention from the required list. Focus on gameplay, pulls, and community moments. No misleading content or fake giveaways.',
      budgetCap: '2000.00',
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    }).returning();

    campaignId = campaign.id;
    console.log('Created Gacha Game campaign');
  } else {
    campaignId = existingCampaign.id;
    console.log('Gacha Game campaign already exists');
  }

  // Create sample clippers for testing
  const sampleClippers = [
    { email: 'clipper1@test.com', name: 'Alpha Clipper', tier: 'tier1' as const, twitter: '@alpha_clipper' },
    { email: 'clipper2@test.com', name: 'Pro Clipper', tier: 'tier2' as const, twitter: '@pro_clipper' },
    { email: 'clipper3@test.com', name: 'Elite Clipper', tier: 'tier3' as const, twitter: '@elite_clipper' },
  ];

  for (const clipper of sampleClippers) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, clipper.email),
    });

    if (!existing) {
      const password = await bcrypt.hash('clipper123', 12);
      const [user] = await db.insert(users).values({
        email: clipper.email,
        passwordHash: password,
        name: clipper.name,
        role: 'clipper',
        twitterHandle: clipper.twitter,
      }).returning();

      const [profile] = await db.insert(clipperProfiles).values({
        userId: user.id,
        tier: clipper.tier,
        status: 'active',
        onboardedAt: new Date(),
      }).returning();

      // Assign to Gacha campaign
      await db.insert(campaignClipperAssignments).values({
        campaignId,
        clipperId: profile.id,
        assignedTier: clipper.tier,
      });

      console.log(`Created clipper: ${clipper.name} (${clipper.tier})`);
    } else {
      console.log(`Clipper ${clipper.name} already exists`);
    }
  }

  // Seed minimal platform settings
  const payoutSettingsExist = await db.query.platformSettings.findFirst({
    where: (settings, { eq }) => eq(settings.key, 'payout_settings'),
  });

  if (!payoutSettingsExist) {
    await db.insert(platformSettings).values({
      key: 'payout_settings',
      value: {
        minimum_views_for_payout: 1000,
      },
    });
    console.log('Created payout settings');
  }

  const contentSettingsExist = await db.query.platformSettings.findFirst({
    where: (settings, { eq }) => eq(settings.key, 'content_settings'),
  });

  if (!contentSettingsExist) {
    await db.insert(platformSettings).values({
      key: 'content_settings',
      value: {
        content_guidelines: 'All clips must be original content posted on Twitter/X. Include required campaign tags.',
      },
    });
    console.log('Created content settings');
  }

  console.log('Seed completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
