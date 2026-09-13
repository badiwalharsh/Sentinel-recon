import bcrypt from 'bcryptjs';
import { dbStore, MockUser } from '@/lib/db-store';
import { prisma } from '@/lib/prisma';

/**
 * Sentinel Recon Administrative Bootstrap Worker
 * Ensures an administrative account is provisioned on initial startup
 * strictly from environment variables (ADMIN_EMAIL and ADMIN_PASSWORD).
 *
 * NOTE: No demo accounts exist in Sentinel Recon.
 */
let bootstrapExecuted = false;

export async function ensureAdminBootstrapped(): Promise<MockUser | null> {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@sentinelrecon.local').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Sentinel2026!';

  // Check if an ADMIN already exists in the store or database
  let existingAdmin = dbStore.users.find((u) => u.systemRole === 'ADMIN' || u.email.toLowerCase() === adminEmail);

  if (!existingAdmin) {
    try {
      const dbAdmin = await prisma.user.findFirst({
        where: { OR: [{ systemRole: 'ADMIN' }, { email: adminEmail }] },
      });
      if (dbAdmin) {
        existingAdmin = {
          id: dbAdmin.id,
          email: dbAdmin.email,
          name: dbAdmin.name,
          passwordHash: dbAdmin.passwordHash,
          systemRole: dbAdmin.systemRole as any,
          isActive: dbAdmin.isActive,
          emailVerified: dbAdmin.emailVerified?.toISOString() || null,
          verificationToken: dbAdmin.verificationToken,
          twoFactorEnabled: dbAdmin.twoFactorEnabled,
          failedLoginCount: dbAdmin.failedLoginCount,
          lockedUntil: dbAdmin.lockedUntil?.toISOString() || null,
          tokenVersion: dbAdmin.tokenVersion || 1,
          createdAt: dbAdmin.createdAt.toISOString(),
        };
        dbStore.users.unshift(existingAdmin);
      }
    } catch {
      // Prisma offline, continue with memory store
    }
  }

  if (existingAdmin) {
    return existingAdmin;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const now = new Date().toISOString();

  const adminUser: MockUser = {
    id: 'usr_admin_bootstrap',
    email: adminEmail,
    name: 'System Administrator (SecOps)',
    passwordHash,
    systemRole: 'ADMIN',
    isActive: true,
    emailVerified: now,
    verificationToken: null,
    twoFactorEnabled: false,
    failedLoginCount: 0,
    lockedUntil: null,
    tokenVersion: 1,
    createdAt: now,
  };

  dbStore.users.unshift(adminUser);

  // Try persisting to Prisma
  try {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        systemRole: 'ADMIN',
        isActive: true,
      },
      create: {
        id: adminUser.id,
        email: adminEmail,
        name: adminUser.name,
        passwordHash,
        systemRole: 'ADMIN',
        isActive: true,
        emailVerified: new Date(now),
        tokenVersion: 1,
      },
    });
  } catch {
    // Suppress if DB offline
  }

  // Ensure admin is added as LEAD_ANALYST to initial programs
  for (const prog of dbStore.programs) {
    if (!prog.memberships.some((m) => m.userId === adminUser.id)) {
      prog.memberships.unshift({
        id: `m_admin_${prog.id}`,
        userId: adminUser.id,
        role: 'LEAD_ANALYST',
      });
    }
  }

  dbStore.persist();

  console.log(`[Sentinel Recon Bootstrap] Admin user initialized: ${adminUser.email}`);
  bootstrapExecuted = true;
  return adminUser;
}

// Auto-run bootstrap on module load
if (!bootstrapExecuted) {
  ensureAdminBootstrapped().catch((err) => {
    console.error('[Sentinel Recon Bootstrap] Initialization error:', err);
  });
}

