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

    const { name, email, password } = parsed.data;
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

    // Create user in Prisma if DB is accessible
    let dbUserCreated = false;
    try {
      const created = await prisma.user.create({
        data: {
          id: newUserId,
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          systemRole: 'ANALYST',
          isActive: true,
          emailVerified: now,
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
      isActive: true,
      emailVerified: now.toISOString(),
      verificationToken: null,
      twoFactorEnabled: false,
      failedLoginCount: 0,
      lockedUntil: null,
      tokenVersion: 1,
      createdAt: now.toISOString(),
    };

    dbStore.users.unshift(newUser);

    // Auto-enroll user into initial active programs
    for (const prog of dbStore.programs) {
      if (!prog.memberships.some((m) => m.userId === newUser.id)) {
        prog.memberships.push({
          id: `m_${newUser.id}_${prog.id}`,
          userId: newUser.id,
          role: 'ANALYST',
        });
        if (dbUserCreated) {
          try {
            await prisma.programMembership.create({
              data: {
                programId: prog.id,
                userId: newUser.id,
                role: 'ANALYST',
              },
            }).catch(() => {});
          } catch {}
        }
      }
    }

    // Persist memory store
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
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        systemRole: newUser.systemRole,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Failed to create operator account' }, { status: 500 });
  }
}

