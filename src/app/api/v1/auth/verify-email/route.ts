import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db-store';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and verification token are required' }, { status: 400 });
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

      response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        path: '/',
      });

      return response;
    }

    if (user.verificationToken !== token.trim()) {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }

    // Verify user
    user.emailVerified = new Date().toISOString();
    user.verificationToken = null;

    await createAuditLog({
      action: 'USER_EMAIL_VERIFIED',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      details: { email: user.email, verifiedAt: user.emailVerified },
      req,
    });

    // Establish session
    const sessionToken = await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      systemRole: user.systemRole,
      tokenVersion: user.tokenVersion || 1,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Email address verified successfully. Security clearance active.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Email verification error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
