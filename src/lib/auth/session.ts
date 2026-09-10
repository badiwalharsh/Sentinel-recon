import { cookies } from 'next/headers';
import { verifySessionToken, TokenPayload } from './jwt';
import { dbStore } from '../db-store';

export const SESSION_COOKIE_NAME = 'sentinel_session';
export const ELEVATION_COOKIE_NAME = 'sentinel_admin_elevation';

export function getSessionCookieOptions(req?: Request) {
  const isProd = process.env.NODE_ENV === 'production';
  let isHttps = false;
  if (req) {
    const proto = req.headers.get('x-forwarded-proto');
    isHttps = proto === 'https' || req.url.startsWith('https://');
  }
  return {
    httpOnly: true,
    secure: isProd ? isHttps : false,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  };
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload || !payload.userId) return null;

    // Ensure store is synced across serverless invocations
    if (typeof dbStore.sync === 'function') {
      dbStore.sync();
    }

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

export async function isAdminElevated(userId?: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const elevationToken = cookieStore.get(ELEVATION_COOKIE_NAME)?.value;
    if (!elevationToken) return false;

    const { verifyElevationToken } = await import('./jwt');
    const verified = await verifyElevationToken(elevationToken);
    if (!verified) return false;

    if (userId && verified.userId !== userId) return false;
    return true;
  } catch {
    return false;
  }
}



