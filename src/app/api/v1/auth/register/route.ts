import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbStore, MockUser } from '@/lib/db-store';
import { registerSchema } from '@/lib/validations/auth';
import { hashPassword } from '@/lib/auth/jwt';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`auth:register:${ip}`, 5, 60);
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

    const { name, email, password } = parsed.data;

    // Check duplicate
    const existing = dbStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'An account with this email address already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const now = new Date().toISOString();

    const newUser: MockUser = {
      id: `usr_${Date.now()}`,
      name,
      email: email.toLowerCase(),
      passwordHash,
      systemRole: 'ANALYST', // Non-negotiable requirement: All new users default to ANALYST
      isActive: true,
      emailVerified: null, // Requires email verification
      verificationToken,
      twoFactorEnabled: false,
      failedLoginCount: 0,
      lockedUntil: null,
      tokenVersion: 1,
      createdAt: now,
    };

    dbStore.users.push(newUser);

    // Auto-add to initial active program as ANALYST
    if (dbStore.programs.length > 0) {
      dbStore.programs[0].memberships.push({
        id: `m_${Date.now()}`,
        userId: newUser.id,
        role: 'ANALYST',
      });
    }

    await createAuditLog({
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: newUser.id,
      userId: newUser.id,
      details: { email: newUser.email, defaultRole: 'ANALYST', verificationRequired: true },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Operator account registered. Please verify your email to activate workspace access.',
      email: newUser.email,
      verificationToken, // Provided in development for seamless verification flow
      verificationUrl: `/verify-email?email=${encodeURIComponent(newUser.email)}&token=${verificationToken}`,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Failed to create operator account' }, { status: 500 });
  }
}
