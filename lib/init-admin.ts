import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

let initialized = false;

export async function ensureAdminUser() {
  // Only run once per server instance
  if (initialized) return;

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Skip if no admin credentials configured
  if (!adminEmail || !adminPassword) {
    console.log('No ADMIN_EMAIL/ADMIN_PASSWORD configured, skipping admin setup');
    initialized = true;
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Check if admin exists
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.role, 'admin'),
    });

    if (existingAdmin) {
      // Update existing admin with new credentials
      await db.update(users)
        .set({
          email: adminEmail,
          passwordHash: passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingAdmin.id));
      console.log(`Admin user updated: ${adminEmail}`);
    } else {
      // Create new admin
      await db.insert(users).values({
        email: adminEmail,
        passwordHash: passwordHash,
        name: 'Admin',
        role: 'admin',
      });
      console.log(`Admin user created: ${adminEmail}`);
    }

    initialized = true;
  } catch (error) {
    console.error('Failed to setup admin user:', error);
  }
}
