// Session token and authentication utilities
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const COOKIE_NAME = 'wb_token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === 'production';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (isProd) {
    throw new Error('JWT_SECRET must be set in production');
  }
  return 'workbench-dev-secret-change-me';
}

// Fail fast at startup in production if the secret is missing
export function assertAuthConfig() {
  getSecret();
}

// Used so that a login for an unknown email takes as long as a real one
export const DUMMY_HASH = bcrypt.hashSync('workbench-dummy-password', 12);

export interface Session {
  userId: string;
  orgId?: string;
}

export function signToken(userId: string, orgId?: string): string {
  return jwt.sign({ sub: userId, oid: orgId }, getSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string | undefined): Session | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getSecret()) as jwt.JwtPayload;
    if (!payload.sub) return null;
    return { userId: String(payload.sub), orgId: payload.oid ? String(payload.oid) : undefined };
  } catch {
    return null;
  }
}

export function readSession(req: Request): Session | null {
  return verifyToken((req as any).cookies?.[COOKIE_NAME]);
}

// Works for both normal requests and the Socket.IO handshake
export function readSessionFromCookieHeader(header: string | undefined): Session | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === COOKIE_NAME) {
      return verifyToken(decodeURIComponent(part.slice(idx + 1).trim()));
    }
  }
  return null;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    // "none" is needed when the frontend and backend are on different domains in production
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  };
}

export function setSessionCookie(res: Response, userId: string, orgId?: string) {
  res.cookie(COOKIE_NAME, signToken(userId, orgId), { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}
