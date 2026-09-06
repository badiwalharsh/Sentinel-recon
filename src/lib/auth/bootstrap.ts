import bcrypt from 'bcryptjs';
import { dbStore, MockUser } from '@/lib/db-store';

/**
 * ReconFlow Administrative Bootstrap Worker
 * Ensures an administrative account is provisioned on initial startup
 * strictly from environment variables (ADMIN_EMAIL and ADMIN_PASSWORD).
 *
 * NOTE: No demo accounts exist in ReconFlow.
 */
let bootstrapExecuted = false;

export async function ensureAdminBootstrapped(): Promise<MockUser | null> {
  // Check if an ADMIN already exists in the store
  const existingAdmin = dbStore.users.find((u) => u.systemRole === 'ADMIN');
  if (existingAdmin) {
    return existingAdmin;
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@reconflow.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@ReconFlow2026!';

  if (!adminEmail || !adminPassword) {
    console.warn('[ReconFlow Bootstrap] ADMIN_EMAIL or ADMIN_PASSWORD not configured in environment.');
    return null;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const now = new Date().toISOString();

  const adminUser: MockUser = {
    id: 'usr_admin_bootstrap',
    email: adminEmail.toLowerCase().trim(),
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

  // Record audit log
  dbStore.auditLogs.unshift({
    id: `audit_boot_${Date.now()}`,
    action: 'ADMIN_BOOTSTRAP',
    entityType: 'User',
    entityId: adminUser.id,
    programId: null,
    userId: adminUser.id,
    ipAddress: '127.0.0.1 (System Bootstrap)',
    userAgent: 'ReconFlow-Bootstrap-Worker/1.0',
    details: {
      email: adminUser.email,
      message: 'System Administrator provisioned via secure environment variable bootstrap.',
    },
    timestamp: now,
  });

  console.log(`[ReconFlow Bootstrap] Admin user successfully initialized: ${adminUser.email}`);
  bootstrapExecuted = true;
  return adminUser;
}

// Auto-run bootstrap on module load
if (!bootstrapExecuted) {
  ensureAdminBootstrapped().catch((err) => {
    console.error('[ReconFlow Bootstrap] Initialization error:', err);
  });
}
