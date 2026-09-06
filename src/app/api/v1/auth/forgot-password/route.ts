import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbStore } from '@/lib/db-store';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`auth:forgot-pwd:${ip}`, 5, 60);
    if (!rateCheck.success) {
      return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 });
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = dbStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    
    // Always return success message to prevent user enumeration attacks
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If the provided email address exists in the system, reset instructions have been dispatched.',
      });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordTokenExpires = expires;

    await createAuditLog({
      action: 'USER_PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      details: { email: user.email },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset token generated.',
      resetToken: token,
      resetUrl: `/reset-password?email=${encodeURIComponent(user.email)}&token=${token}`,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
