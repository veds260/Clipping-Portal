export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runStartupMigrations } = await import('@/lib/startup-migrate');
    await runStartupMigrations();

    const { ensureAdminUser } = await import('@/lib/init-admin');
    await ensureAdminUser();
  }
}
