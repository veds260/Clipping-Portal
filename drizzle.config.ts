import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load .env.local for local development (Railway sets env vars directly)
config({ path: '.env.local' });

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  },
});
