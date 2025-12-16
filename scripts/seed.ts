import { config } from 'dotenv';
config({ path: '.env.local' });

async function seed() {
  // Dynamic imports to ensure dotenv is loaded first
  const { db } = await import('../lib/db');
  const { users, platformSettings, distributionChannels } = await import('../lib/db/schema');
  const bcrypt = await import('bcryptjs');

  console.log('Starting seed...');

  // Create admin user from environment variables or use defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@compound.com';
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

  // Seed default settings
  const payoutSettingsExist = await db.query.platformSettings.findFirst({
    where: (settings, { eq }) => eq(settings.key, 'payout_settings'),
  });

  if (!payoutSettingsExist) {
    await db.insert(platformSettings).values({
      key: 'payout_settings',
      value: {
        minimum_views_for_payout: 1000,
        bonus_threshold_views: 100000,
        bonus_multiplier: 1.5,
      },
    });
    console.log('Created default payout settings');
  }

  const contentSettingsExist = await db.query.platformSettings.findFirst({
    where: (settings, { eq }) => eq(settings.key, 'content_settings'),
  });

  if (!contentSettingsExist) {
    await db.insert(platformSettings).values({
      key: 'content_settings',
      value: {
        minimum_clip_duration: 7,
        maximum_clip_duration: 90,
        content_guidelines: '',
      },
    });
    console.log('Created default content settings');
  }

  const tierSettingsExist = await db.query.platformSettings.findFirst({
    where: (settings, { eq }) => eq(settings.key, 'tier_settings'),
  });

  if (!tierSettingsExist) {
    await db.insert(platformSettings).values({
      key: 'tier_settings',
      value: {
        tier_approved_min_clips: 10,
        tier_core_min_views: 500000,
        tier_core_min_clips: 50,
        tier_approved_min_avg_views: 1000,
        tier_core_min_avg_views: 5000,
        entry_benefits: '',
        approved_benefits: '',
        core_benefits: '',
        entry_pay_rate: 1.0,
        approved_pay_rate: 1.5,
        core_pay_rate: 2.0,
      },
    });
    console.log('Created default tier settings');
  }

  // Seed 20 Distribution Channels
  const existingChannels = await db.query.distributionChannels.findMany();

  if (existingChannels.length === 0) {
    const channels = [
      // CRYPTO & WEB3 (5 channels)
      {
        name: 'Crypto Alpha',
        niche: 'crypto',
        description: 'Trading alpha, market moves, and crypto insights. High-energy content about making money in crypto.',
        targetAudience: 'Crypto traders, DeFi degens, people looking for the next 100x',
        contentGuidelines: 'Fast-paced, exciting clips. Show wins, predictions, market analysis. Avoid boring explanations.',
        fillerContentSources: '@CryptoCobain\n@Pentosh1\n@inversebrah\n@EmberCN\n@GCRClassic',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'core' as const,
      },
      {
        name: 'DeFi Decoded',
        niche: 'crypto',
        description: 'DeFi protocols, yield strategies, and on-chain opportunities explained simply.',
        targetAudience: 'DeFi users, yield farmers, protocol enthusiasts',
        contentGuidelines: 'Educational but exciting. Show the opportunities, not just the tech. Numbers and yields perform well.',
        fillerContentSources: '@DefiIgnas\n@Dynamo_Patrick\n@theaboredfarmer\n@Darrenlautf',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'approved' as const,
      },
      {
        name: 'Web3 Builders',
        niche: 'crypto',
        description: 'Developers building the future of the internet. Code, ships, and building in public.',
        targetAudience: 'Web3 developers, founders building on-chain, tech-savvy crypto natives',
        contentGuidelines: 'Technical but accessible. Show the building process, wins, product launches.',
        fillerContentSources: '@VitalikButerin\n@balaboris\n@haydenzadams\n@stikieinc',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'core' as const,
      },
      {
        name: 'NFT Culture',
        niche: 'crypto',
        description: 'Digital art, collections, and the NFT ecosystem. Culture over speculation.',
        targetAudience: 'NFT collectors, digital artists, culture enthusiasts',
        contentGuidelines: 'Focus on culture, community, and art. Avoid pure speculation content.',
        fillerContentSources: '@punk6529\n@beeaboredple\n@pranksy\n@garyvee',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'approved' as const,
      },
      {
        name: 'Onchain Life',
        niche: 'crypto',
        description: 'Living crypto-native. Payments, lifestyle, and the future of money.',
        targetAudience: 'Crypto enthusiasts who want to live on-chain',
        contentGuidelines: 'Lifestyle content with crypto angle. Show practical use cases, not just trading.',
        fillerContentSources: '@balajis\n@naval\n@cdixon\n@chriscantino',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'approved' as const,
      },

      // AI & TECH (4 channels)
      {
        name: 'AI Frontiers',
        niche: 'ai',
        description: 'Cutting-edge AI developments, tools, and the future of intelligence.',
        targetAudience: 'AI enthusiasts, developers, founders building with AI',
        contentGuidelines: 'Exciting demos, new capabilities, mind-blowing AI moments. Show dont tell.',
        fillerContentSources: '@sama\n@kaboredarpathy\n@ylecun\n@DrJimFan\n@emaboredostheim',
        allowsFillerContent: true,
        status: 'active' as const,
        tierRequired: 'core' as const,
      },
      {
        name: 'Tech Disruption',
        niche: 'tech',
        description: 'Emerging tech that will change everything. From AI to biotech to space.',
        targetAudience: 'Tech enthusiasts, futurists, innovation junkies',
        contentGuidelines: 'Focus on the wow factor. Big claims, bold predictions, paradigm shifts.',
        fillerContentSources: '@elonmusk\n@lexfridman\n@waitbutwhy\n@pmarca',
        allowsFillerContent: true,
        status: 'active' as const,
        tierRequired: 'approved' as const,
      },
      {
        name: 'Code & Ship',
        niche: 'tech',
        description: 'Developer lifestyle, coding tips, and shipping products.',
        targetAudience: 'Developers, indie hackers, people learning to code',
        contentGuidelines: 'Practical, inspiring, relatable. Show the grind and the wins.',
        fillerContentSources: '@levelsio\n@marc_louvion\n@tdinh_me\n@dannypostmaa',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'approved' as const,
      },
      {
        name: 'Future Tech',
        niche: 'tech',
        description: 'Predictions and emerging trends that will shape tomorrow.',
        targetAudience: 'Forward-thinkers, investors, anyone curious about the future',
        contentGuidelines: 'Big picture thinking. Connect dots between trends. Be bold.',
        fillerContentSources: '@balajis\n@ARKInvest\n@pitdesi\n@aaboreds',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'core' as const,
      },

      // FINANCE & TRADING (4 channels)
      {
        name: 'Wealth Mindset',
        niche: 'finance',
        description: 'Money psychology, abundance thinking, and building wealth.',
        targetAudience: 'Aspiring wealthy, self-improvement focused, money-conscious',
        contentGuidelines: 'Inspirational but actionable. Rich lifestyle meets practical wisdom.',
        fillerContentSources: '@naval\n@TheAncapabordBarber\n@SahilBloom\n@JamesClear',
        allowsFillerContent: true,
        status: 'active' as const,
        tierRequired: 'approved' as const,
      },
      {
        name: 'Trading Floor',
        niche: 'trading',
        description: 'Markets, charts, and trading insights from the trenches.',
        targetAudience: 'Active traders, market watchers, finance bros',
        contentGuidelines: 'Real trades, real analysis. Show wins AND lessons. No pure flexing.',
        fillerContentSources: '@CiovaccoCapital\n@TicaboredkerTodd\n@TDAmeritrade\n@RealVision',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'core' as const,
      },
      {
        name: 'Investor Edge',
        niche: 'finance',
        description: 'Long-term investing wisdom and market insights.',
        targetAudience: 'Long-term investors, value investors, wealth builders',
        contentGuidelines: 'Timeless wisdom, market insights, wealth building strategies.',
        fillerContentSources: '@morganhousel\n@Nicolascbordeole\n@chaaboredth\n@gaborgurbacs',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'approved' as const,
      },
      {
        name: 'Side Hustle Lab',
        niche: 'finance',
        description: 'Extra income streams, side businesses, and money-making opportunities.',
        targetAudience: 'People looking for extra income, aspiring entrepreneurs',
        contentGuidelines: 'Practical, achievable ideas. Show real results and how-tos.',
        fillerContentSources: '@Codie_Sanchez\n@thejustinwelsh\n@dickiebush\n@AliAbdaal',
        allowsFillerContent: true,
        status: 'active' as const,
        tierRequired: 'entry' as const,
      },

      // FOUNDERS & STARTUPS (3 channels)
      {
        name: 'Founder Life',
        niche: 'founder',
        description: 'The startup journey - wins, losses, and lessons from the trenches.',
        targetAudience: 'Founders, aspiring entrepreneurs, startup enthusiasts',
        contentGuidelines: 'Raw, real, relatable. Show the journey, not just the destination.',
        fillerContentSources: '@alexbormozi\n@SamParr\n@shaboreden\n@StartupLJackson',
        allowsFillerContent: true,
        status: 'active' as const,
        tierRequired: 'core' as const,
      },
      {
        name: 'Startup Grind',
        niche: 'founder',
        description: 'Hustle culture, growth tactics, and startup execution.',
        targetAudience: 'Growth-focused founders, operators, startup teams',
        contentGuidelines: 'Tactical, actionable, high-energy. Growth hacks and execution tips.',
        fillerContentSources: '@Nicolascole\n@thegaryvee\n@JasonLemkin\n@hunterwalk',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'approved' as const,
      },
      {
        name: 'CEO Playbook',
        niche: 'founder',
        description: 'Leadership, management, and running companies at scale.',
        targetAudience: 'CEOs, executives, scaling founders',
        contentGuidelines: 'High-level strategy, leadership wisdom, scaling lessons.',
        fillerContentSources: '@Altimaboreder\n@baborededelman\n@benthompson\n@bgurley',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'core' as const,
      },

      // LIFESTYLE & MOTIVATION (4 channels)
      {
        name: 'Luxury & Leverage',
        niche: 'lifestyle',
        description: 'The high life meets smart money. Luxury that inspires.',
        targetAudience: 'Aspirational audience, luxury enthusiasts, success-oriented',
        contentGuidelines: 'Beautiful visuals, aspirational content. Lifestyle with substance.',
        fillerContentSources: '@DanPena\n@TaiLopez\n@gaboredtsbee\n@theweeknd',
        allowsFillerContent: true,
        status: 'active' as const,
        tierRequired: 'core' as const,
      },
      {
        name: 'Hot Takes',
        niche: 'motivation',
        description: 'Controversial opinions, spicy takes, and debates that get people talking.',
        targetAudience: 'Engagement seekers, debate lovers, hot take enthusiasts',
        contentGuidelines: 'Controversial but not offensive. Takes that spark discussion.',
        fillerContentSources: '@chamath\n@Jason\n@davidaboredacks\n@elaborendudley',
        allowsFillerContent: true,
        status: 'active' as const,
        tierRequired: 'approved' as const,
      },
      {
        name: 'Success Stories',
        niche: 'motivation',
        description: 'Wins, transformations, and journeys that inspire.',
        targetAudience: 'People seeking inspiration, self-improvement focused',
        contentGuidelines: 'Emotional, inspiring, transformation-focused. Before/after moments.',
        fillerContentSources: '@therock\n@MrBeast\n@Schwarzenegger\n@oprah',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'entry' as const,
      },
      {
        name: 'Discipline Wins',
        niche: 'motivation',
        description: 'Productivity, habits, and the grind that leads to success.',
        targetAudience: 'Self-improvers, productivity nerds, discipline seekers',
        contentGuidelines: 'Practical, motivating, actionable. Show systems and habits.',
        fillerContentSources: '@Jockowillink\n@hubaborederman\n@david_goggins\n@TimAustinCEO',
        allowsFillerContent: true,
        status: 'growing' as const,
        tierRequired: 'entry' as const,
      },
    ];

    for (const channel of channels) {
      await db.insert(distributionChannels).values(channel);
    }
    console.log(`Created ${channels.length} distribution channels`);
  } else {
    console.log(`Distribution channels already exist (${existingChannels.length} found)`);
  }

  console.log('Seed completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
