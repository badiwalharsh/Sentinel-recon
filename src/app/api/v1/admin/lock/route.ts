import { NextResponse } from 'next/server';
import { getCurrentUser, ELEVATION_COOKIE_NAME } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.systemRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
  }

  await createAuditLog({
    action: 'USER_LOGOUT',
    entityType: 'AdminSecurityGate',
    entityId: user.userId,
    userId: user.userId,
    details: { message: 'Administrator manually locked the admin security console', email: user.email },
    req,
  });

  const response = NextResponse.json({ success: true, message: 'Admin console locked.' });
  response.cookies.delete(ELEVATION_COOKIE_NAME);
  return response;
}
