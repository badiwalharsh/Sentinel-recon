import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db-store';
import { prisma } from '@/lib/prisma';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from '@/lib/auth/session';
import { loginSchema } from '@/lib/validations/auth';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`auth:login:${ip}`, 10, 60);
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

    const normalizedEmail = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;

    // 1. Query user from Prisma or dbStore
    let user: any = null;
    let isDbUser = false;

    try {
      const dbUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (dbUser) {
        user = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          passwordHash: dbUser.passwordHash,
          systemRole: dbUser.systemRole,
          status: dbUser.status || (dbUser.isActive ? 'APPROVED' : 'SUSPENDED'),
          isActive: dbUser.isActive,
          rejectionReason: dbUser.rejectionReason,
          failedLoginCount: dbUser.failedLoginCount,
          lockedUntil: dbUser.lockedUntil?.toISOString() || null,
          tokenVersion: dbUser.tokenVersion || 1,
        };
        isDbUser = true;
      }
    } catch {
      // Prisma offline, proceed with memory store
    }

    if (!user) {
      if (typeof dbStore.sync === 'function') {
        dbStore.sync();
      }
      user = dbStore.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    }

    // Generic error response to prevent user enumeration
    if (!user) {
      await createAuditLog({
        action: 'SECURITY_ALERT',
        entityType: 'User',
        details: { reason: 'Login attempt for non-existent user', email: normalizedEmail },
        req,
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Explicit account status enforcement
    const userStatus = user.status || (user.isActive ? 'APPROVED' : 'SUSPENDED');

    if (userStatus === 'PENDING') {
      return NextResponse.json(
        {
          error: 'Your account registration is currently pending administrator approval. Please wait for an administrator to review and approve your request.',
          status: 'PENDING',
        },
        { status: 403 }
      );
    }

    if (userStatus === 'REJECTED') {
      return NextResponse.json(
        {
          error: user.rejectionReason
            ? `Your registration request was rejected: "${user.rejectionReason}"`
            : 'Your registration request was rejected by an administrator.',
          status: 'REJECTED',
        },
        { status: 403 }
      );
    }

    if (userStatus === 'SUSPENDED' || !user.isActive) {
      return NextResponse.json(
        {
          error: 'Your account has been suspended by a security administrator. Contact SecOps.',
          status: 'SUSPENDED',
        },
        { status: 403 }
      );
    }

    if (userStatus === 'DISABLED') {
      return NextResponse.json(
        {
          error: 'Your account has been permanently disabled.',
          status: 'DISABLED',
        },
        { status: 403 }
      );
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return NextResponse.json(
        { error: 'Account is temporarily locked due to excessive failed attempts. Please try again later.' },
        { status: 423 }
      );
    }

    // 2. Verify password
    let isMatch = false;
    try {
      if (user.passwordHash) {
        isMatch = await bcrypt.compare(password, user.passwordHash);
      }
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      const newFailedCount = (user.failedLoginCount || 0) + 1;
      let newLockedUntil: string | null = null;

      if (newFailedCount >= 5) {
        newLockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await createAuditLog({
          action: 'SECURITY_ALERT',
          entityType: 'User',
          entityId: user.id,
          userId: user.id,
          details: { reason: 'Account locked due to 5 consecutive failed login attempts', email: user.email },
          req,
        });
      }

      await createAuditLog({
        action: 'SECURITY_ALERT',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        details: { reason: 'Invalid password entered', failedAttempts: newFailedCount },
        req,
      });

      // Update store & DB
      user.failedLoginCount = newFailedCount;
      user.lockedUntil = newLockedUntil;
      const memUser = dbStore.users.find((u) => u.id === user.id);
      if (memUser) {
        memUser.failedLoginCount = newFailedCount;
        memUser.lockedUntil = newLockedUntil;
      }
      dbStore.persist();

      if (isDbUser) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: newFailedCount,
              lockedUntil: newLockedUntil ? new Date(newLockedUntil) : null,
            },
          }).catch(() => {});
        } catch {}
      }

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 3. Reset failed login counter on success
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    const memUser = dbStore.users.find((u) => u.id === user.id);
    if (memUser) {
      memUser.failedLoginCount = 0;
      memUser.lockedUntil = null;
    }
    dbStore.persist();

    if (isDbUser) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        }).catch(() => {});
      } catch {}
    }

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

    // Set secure cookie
    const cookieOptions = getSessionCookieOptions(req);
    response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions);

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Authentication internal server error' }, { status: 500 });
  }
}

