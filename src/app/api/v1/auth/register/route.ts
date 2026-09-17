import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbStore, MockUser } from '@/lib/db-store';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validations/auth';
import { hashPassword } from '@/lib/auth/jwt';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sendEmail, generateEmailVerificationHtml } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`auth:register:${ip}`, 10, 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: 'Too many registration requests. Please wait before retrying.',
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
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, email, password, requestedRole, ethicalAgreementConfirmed } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate in Prisma & dbStore
    let isDuplicate = dbStore.users.some((u) => u.email.toLowerCase() === normalizedEmail);
    if (!isDuplicate) {
      try {
        const existingInDb = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existingInDb) isDuplicate = true;
      } catch {
        // Suppress if DB offline
      }
    }

    if (isDuplicate) {
      return NextResponse.json({ error: 'An account with this email address already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const now = new Date();
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Create user in Prisma if DB is accessible with PENDING status
    let dbUserCreated = false;
    try {
      const created = await prisma.user.create({
        data: {
          id: newUserId,
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          systemRole: 'ANALYST',
          requestedRole: requestedRole || 'ANALYST',
          status: 'PENDING',
          isActive: false, // Inactive until approved
          ethicalUseAccepted: ethicalAgreementConfirmed ?? true,
          emailVerified: null,
          verificationToken,
          tokenVersion: 1,
        },
      });
      if (created) dbUserCreated = true;
    } catch (e) {
      console.warn('[Register] Prisma write fallback:', e);
    }

    const newUser: MockUser = {
      id: newUserId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      systemRole: 'ANALYST',
      requestedRole: requestedRole || 'ANALYST',
      status: 'PENDING',
      isActive: false,
      ethicalUseAccepted: ethicalAgreementConfirmed ?? true,
      emailVerified: null,
      verificationToken,
      twoFactorEnabled: false,
      failedLoginCount: 0,
      lockedUntil: null,
      tokenVersion: 1,
      createdAt: now.toISOString(),
    };

    dbStore.users.unshift(newUser);
    dbStore.persist();

    // Send verification email asynchronously if service configured
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const verifyLink = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;
      const html = generateEmailVerificationHtml(newUser.name, verifyLink);
      await sendEmail({
        to: normalizedEmail,
        subject: 'Verify your Sentinel Recon account',
        html,
      }).catch(() => {});
    } catch {}

    await createAuditLog({
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: newUser.id,
      userId: newUser.id,
      details: {
        email: newUser.email,
        requestedRole: newUser.requestedRole,
        status: 'PENDING',
        ethicalAgreementConfirmed: true,
      },
      req,
    });

    // Import realtime broker and emit event
    const { publishRealtimeEvent } = await import('@/lib/realtime/broker');
    await publishRealtimeEvent({
      eventType: 'USER_REGISTERED',
      entityType: 'User',
      entityId: newUser.id,
      targetUserId: newUser.id,
      channels: ['admin:users', `user:${newUser.id}`],
      payload: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        requestedRole: newUser.requestedRole,
        status: 'PENDING',
        createdAt: newUser.createdAt,
      },
    });

    return NextResponse.json({
      success: true,
      status: 'PENDING',
      message: 'Registration submitted successfully. Your account is pending administrator approval before access is granted.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        requestedRole: newUser.requestedRole,
        status: newUser.status,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Failed to create operator account' }, { status: 500 });
  }
}

