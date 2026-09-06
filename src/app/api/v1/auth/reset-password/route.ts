import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db-store';
import { hashPassword } from '@/lib/auth/jwt';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, token, newPassword } = body;

    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (newPassword.length < 12) {
      return NextResponse.json({ error: 'New passphrase must be at least 12 characters' }, { status: 400 });
    }

    const user = dbStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired password reset request' }, { status: 400 });
    }

    if (!user.resetPasswordToken || user.resetPasswordToken !== token.trim()) {
      return NextResponse.json({ error: 'Invalid or expired password reset token' }, { status: 400 });
    }

    if (user.resetPasswordTokenExpires && new Date() > new Date(user.resetPasswordTokenExpires)) {
      return NextResponse.json({ error: 'Password reset token has expired. Please request a new one.' }, { status: 400 });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion || 1) + 1; // Invalidate all prior sessions
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpires = null;
    user.failedLoginCount = 0;
    user.lockedUntil = null;

    await createAuditLog({
      action: 'USER_PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      details: { email: user.email, tokenVersion: user.tokenVersion },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Passphrase reset successful. All prior sessions invalidated. Please sign in.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Failed to reset passphrase' }, { status: 500 });
  }
}
