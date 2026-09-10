import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    'reconflow-production-ready-jwt-session-secret-key-32bytes-min!'
);


export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  systemRole: 'ADMIN' | 'ANALYST' | 'VIEWER' | 'AUDITOR';
  tokenVersion?: number;
  [key: string]: any;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function signElevationToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email, elevated: true, purpose: 'ADMIN_PANEL_ACCESS' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(SECRET_KEY);
}

export async function verifyElevationToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (payload.elevated === true && payload.purpose === 'ADMIN_PANEL_ACCESS') {
      return { userId: payload.userId as string, email: payload.email as string };
    }
    return null;
  } catch {
    return null;
  }
}

