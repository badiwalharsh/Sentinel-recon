import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db-store';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from '@/lib/auth/session';
import { loginSchema } from '@/lib/validations/auth';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`auth:login:${ip}`, 5, 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: 'Too many authentication attempts. Please wait before retrying.',
          retryAfter: rateCheck.resetSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateCheck.resetSeconds.toString(),
          },
        }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid credentials payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Ensure database store is fresh
    if (typeof dbStore.sync === 'function') {
      dbStore.sync();
    }

    // Check user in store
    const user = dbStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      await createAuditLog({
        action: 'SECURITY_ALERT',
        entityType: 'User',
        details: { reason: 'Login attempt for non-existent user', email },
        req,
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account has been deactivated. Contact an administrator.' }, { status: 403 });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return NextResponse.json(
        { error: 'Account is temporarily locked due to excessive failed attempts. Please try again later.' },
        { status: 423 }
      );
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await createAuditLog({
          action: 'SECURITY_ALERT',
          entityType: 'User',
          entityId: user.id,
          userId: user.id,
          details: { reason: 'Account locked due to 5 consecutive failed login attempts', email },
          req,
        });
      }

      await createAuditLog({
        action: 'SECURITY_ALERT',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        details: { reason: 'Invalid password entered', failedAttempts: user.failedLoginCount },
        req,
      });

      dbStore.persist();
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Reset failed count
    user.failedLoginCount = 0;
    user.lockedUntil = null;

    // Ensure user has membership in programs so dashboard displays data
    for (const prog of dbStore.programs) {
      if (!prog.memberships.some((m) => m.userId === user.id)) {
        prog.memberships.push({
          id: `m_${user.id}_${prog.id}`,
          userId: user.id,
          role: user.systemRole === 'ADMIN' ? 'LEAD_ANALYST' : user.systemRole === 'VIEWER' ? 'VIEWER' : user.systemRole === 'AUDITOR' ? 'AUDITOR' : 'ANALYST',
        });
      }
    }

    dbStore.persist();

    // Sign JWT
    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      systemRole: user.systemRole,
      tokenVersion: user.tokenVersion || 1,
    });

    // Record login audit
    await createAuditLog({
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      details: { email: user.email, systemRole: user.systemRole },
      req,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
      },
    });

    // Set secure cookie with lax SameSite for seamless immediate redirection
    const cookieOptions = getSessionCookieOptions(req);
    response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions);

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Authentication internal server error' }, { status: 500 });
  }

}
