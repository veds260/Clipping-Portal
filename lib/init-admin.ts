import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function ensureAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('No ADMIN_EMAIL/ADMIN_PASSWORD configured, skipping admin setup');
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.role, 'admin'),
    });

    if (existingAdmin) {
      await db.update(users)
        .set({
          email: adminEmail,
          passwordHash: passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingAdmin.id));
      console.log(`Admin user updated: ${adminEmail}`);
    } else {
      await db.insert(users).values({
        email: adminEmail,
        passwordHash: passwordHash,
        name: 'Admin',
        role: 'admin',
      });
      console.log(`Admin user created: ${adminEmail}`);
    }
  } catch (error) {
    console.error('Failed to setup admin user:', error);
  }
}
