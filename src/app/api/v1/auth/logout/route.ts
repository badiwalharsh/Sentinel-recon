import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { getCurrentUser } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/audit';

import { dbStore } from '@/lib/db-store';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user) {
      // Invalidate active session token server-side
      const targetUser = dbStore.users.find((u) => u.id === user.userId);
      if (targetUser) {
        targetUser.tokenVersion = (targetUser.tokenVersion || 1) + 1;
      }

      await createAuditLog({
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: user.userId,
        userId: user.userId,
        details: { email: user.email },
        req,
      });
    }

    const response = NextResponse.json({ success: true, message: 'Successfully logged out' });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (err) {
    const response = NextResponse.json({ success: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}
