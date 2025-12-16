import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || '';

// Create a dummy client for build time (when DATABASE_URL is not available)
// The actual connection only happens when queries are made at runtime
const client = postgres(connectionString, {
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  max: connectionString ? 10 : 0, // No connections if no URL
});

export const db = drizzle(client, { schema });
