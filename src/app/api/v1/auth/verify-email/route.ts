import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db-store';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and verification token are required' }, { status: 400 });
    }

    if (typeof dbStore.sync === 'function') {
      dbStore.sync();
    }

    const user = dbStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return NextResponse.json({ error: 'Operator account not found' }, { status: 404 });
    }

    if (user.emailVerified && !user.verificationToken) {
      // Already verified, sign them in
      const sessionToken = await signSessionToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        systemRole: user.systemRole,
        tokenVersion: user.tokenVersion || 1,
      });

      const response = NextResponse.json({
        success: true,
        message: 'Account is already verified. Session active.',
        user: { id: user.id, name: user.name, email: user.email, systemRole: user.systemRole },
      });

      const cookieOptions = getSessionCookieOptions(req);
      response.cookies.set(SESSION_COOKIE_NAME, sessionToken, cookieOptions);

      return response;
    }

    if (user.verificationToken !== token.trim()) {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }

    // Verify user email
    const now = new Date();
    user.emailVerified = now.toISOString();
    user.verificationToken = null;

    try {
      const { prisma } = await import('@/lib/prisma');
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: now,
          verificationToken: null,
        },
      }).catch(() => {});
    } catch {}

    dbStore.persist();

    await createAuditLog({
      action: 'USER_EMAIL_VERIFIED',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      details: { email: user.email, verifiedAt: user.emailVerified },
      req,
    });

    const { publishRealtimeEvent } = await import('@/lib/realtime/broker');
    await publishRealtimeEvent({
      eventType: 'USER_EMAIL_VERIFIED',
      entityType: 'User',
      entityId: user.id,
      targetUserId: user.id,
      channels: ['admin:users', `user:${user.id}`],
      payload: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        status: user.status,
      },
    });

    if (user.status === 'APPROVED' && user.isActive) {
      // Establish session if already approved
      const sessionToken = await signSessionToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        systemRole: user.systemRole,
        status: user.status,
        tokenVersion: user.tokenVersion || 1,
      });

      const response = NextResponse.json({
        success: true,
        isApproved: true,
        message: 'Email address verified successfully. Security clearance active.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          systemRole: user.systemRole,
          status: user.status,
        },
      });

      const cookieOptions = getSessionCookieOptions(req);
      response.cookies.set(SESSION_COOKIE_NAME, sessionToken, cookieOptions);
      return response;
    }

    return NextResponse.json({
      success: true,
      isApproved: false,
      status: 'PENDING',
      message: 'Email address verified successfully. Your account is pending administrator approval before you can sign in.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status || 'PENDING',
      },
    });
  } catch (err: any) {
    console.error('Email verification error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
