import { cookies } from 'next/headers';
import { verifySessionToken, TokenPayload } from './jwt';
import { dbStore } from '../db-store';

export const SESSION_COOKIE_NAME = 'sentinel_session';

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  // Verify user is active in datastore
  const user = dbStore.users.find((u) => u.id === payload.userId);

  if (!user || !user.isActive) return null;
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) return null;

  // Session invalidation on role change, password change, or explicit logout
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

