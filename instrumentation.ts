export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Backup admin creation - delayed 30s to let background migrations finish first
    setTimeout(async () => {
      try {
        const { ensureAdminUser } = await import('@/lib/init-admin');
        await ensureAdminUser();
      } catch (e) {
        console.error('[instrumentation] Admin setup failed:', (e as Error).message);
      }
    }, 30000);
  }
}
