import type { CookieOptions, Response } from 'express';
import { SESSION_COOKIE } from './auth.types';

const isProduction = () => process.env.NODE_ENV === 'production';

export function sessionCookieOptions(expiresAt?: Date): CookieOptions {
  const domain = process.env.COOKIE_DOMAIN?.trim();
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    ...(domain ? { domain } : {}),
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
}
