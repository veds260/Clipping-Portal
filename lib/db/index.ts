import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || '';

// Optimized connection pool settings for production
// Based on best practices from postgres.js and Drizzle ORM documentation
const client = postgres(connectionString, {
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  max: connectionString ? 10 : 0,
  fetch_types: false,
  transform: {
    undefined: null,
  },
});

export const db = drizzle(client, { schema });
