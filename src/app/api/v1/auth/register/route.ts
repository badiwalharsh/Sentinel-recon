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
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      systemRole: 'ANALYST',
      isActive: true,
      emailVerified: now,
      verificationToken: null,
      twoFactorEnabled: false,
      failedLoginCount: 0,
      lockedUntil: null,
      tokenVersion: 1,
      createdAt: now,
    };

    dbStore.users.push(newUser);

    // Auto-enroll user into all programs as ANALYST
    for (const prog of dbStore.programs) {
      if (!prog.memberships.some((m) => m.userId === newUser.id)) {
        prog.memberships.push({
          id: `m_${newUser.id}_${prog.id}`,
          userId: newUser.id,
          role: 'ANALYST',
        });
      }
    }

    // Persist immediately to disk
    dbStore.persist();

    await createAuditLog({
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: newUser.id,
      userId: newUser.id,
      details: { email: newUser.email, defaultRole: 'ANALYST', verificationRequired: false },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Operator account registered successfully.',
      email: newUser.email,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Failed to create operator account' }, { status: 500 });
  }
}
