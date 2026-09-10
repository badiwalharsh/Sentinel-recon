import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/audit';

// In-memory runtime settings store
let systemSettings = {
  platformName: 'ReconFlow OSINT Workbench',
  sessionTimeoutMinutes: 60,
  minPasswordLength: 12,
  enforceEmailVerification: true,
  enableRateLimiting: true,
  maxFailedLoginsBeforeLockout: 5,
  auditLogRetentionDays: 365,
  allowPublicRegistration: true,
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.systemRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Administrator access required.' }, { status: 403 });
  }

  return NextResponse.json({ success: true, settings: systemSettings });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.systemRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Administrator access required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    systemSettings = {
      ...systemSettings,
      ...body,
      // Non-negotiable security defaults
      minPasswordLength: Math.max(12, Number(body.minPasswordLength) || 12),
      enforceEmailVerification: true,
    };

    await createAuditLog({
      action: 'SYSTEM_SETTINGS_UPDATE',
      entityType: 'SystemConfig',
      entityId: 'global',
      userId: user.userId,
      details: { updatedSettings: systemSettings },
      req,
    });

    return NextResponse.json({ success: true, settings: systemSettings });
  } catch (err) {
    console.error('Failed to update system settings:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
