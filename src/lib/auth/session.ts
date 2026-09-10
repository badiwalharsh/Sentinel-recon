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
  // Ensure store is synced across serverless invocations
  if (typeof dbStore.sync === 'function') {
    dbStore.sync();
  }

  // 1. Check Clerk session first if active
  try {
    const { currentUser } = await import('@clerk/nextjs/server');
    const clerkUser = await currentUser();
    if (clerkUser) {
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';
      const name =
        `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
        clerkUser.username ||
        'Operator';
      const roleFromMeta =
        (clerkUser.publicMetadata?.role as string) ||
        (email.toLowerCase().includes('admin') ? 'ADMIN' : 'ANALYST');

      let user = dbStore.users.find(
        (u) => u.id === clerkUser.id || (email && u.email.toLowerCase() === email.toLowerCase())
      );

      if (!user && email) {
        user = {
          id: clerkUser.id,
          email: email.toLowerCase(),
          name,
          passwordHash: '',
          systemRole: roleFromMeta as any,
          isActive: true,
          emailVerified: new Date().toISOString(),
          twoFactorEnabled: false,
          failedLoginCount: 0,
          lockedUntil: null,
          tokenVersion: 1,
          createdAt: new Date().toISOString(),
        };
        dbStore.users.unshift(user);

        for (const prog of dbStore.programs) {
          if (!prog.memberships.some((m) => m.userId === user!.id)) {
            prog.memberships.push({
              id: `m_${user!.id}_${prog.id}`,
              userId: user!.id,
              role: roleFromMeta === 'ADMIN' ? 'LEAD_ANALYST' : 'ANALYST',
            });
          }
        }
        dbStore.persist();
      }

      return {
        userId: user ? user.id : clerkUser.id,
        email: email || (user ? user.email : 'operator@reconflow.local'),
        name: user ? user.name : name,
        systemRole: (user ? user.systemRole : roleFromMeta) as TokenPayload['systemRole'],
        tokenVersion: 1,
      };
    }
  } catch (e) {
    // Continue to standard session cookie check
  }

  // 2. Check JWT session cookie
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



