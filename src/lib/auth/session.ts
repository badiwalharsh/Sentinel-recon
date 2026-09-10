import { cookies } from 'next/headers';
import { verifySessionToken, TokenPayload } from './jwt';
import { dbStore } from '../db-store';

export const SESSION_COOKIE_NAME = 'sentinel_session';

export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload || !payload.userId) return null;

    // Verify user is in datastore
    const user = dbStore.users.find(
      (u) => u.id === payload.userId || u.email.toLowerCase() === payload.email?.toLowerCase()
    );

    if (user) {
      if (!user.isActive) return null;
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) return null;

      // Session invalidation check
      const tokenVer = payload.tokenVersion ?? 1;
      if (user.tokenVersion && tokenVer !== user.tokenVersion) {
        return null;
      }

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        systemRole: user.systemRole as TokenPayload['systemRole'],
        tokenVersion: user.tokenVersion,
      };
    }

    // Fallback if user verified by signed JWT signature
    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name || 'Security Operator',
      systemRole: payload.systemRole || 'ANALYST',
      tokenVersion: payload.tokenVersion || 1,
    };
  } catch (err) {
    return null;
  }
}


