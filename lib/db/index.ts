import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || '';

// Optimized connection pool settings for production
// Based on best practices from postgres.js and Drizzle ORM documentation
const client = postgres(connectionString, {
  // Disable prepare for serverless environments (Railway, Vercel)
  prepare: false,

  // Connection timeouts
  connect_timeout: 10,      // Max time to establish connection (seconds)
  idle_timeout: 20,         // Close idle connections after 20 seconds
  max_lifetime: 60 * 30,    // Max connection lifetime (30 minutes)

  // Pool size - adjust based on your database's max_connections
  // Railway PostgreSQL typically allows 100 connections
  // Keep low to prevent connection exhaustion with multiple instances
  max: connectionString ? 10 : 0,

  // Fetch multiple rows at once for better performance
  fetch_types: false,

  // Transform options for better performance
  transform: {
    undefined: null,
  },
});

export const db = drizzle(client, { schema });
