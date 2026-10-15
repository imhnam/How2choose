import type { Request } from 'express';
export type AuthUser = { id: string; email: string | null; phone: string | null; displayName: string | null };
export type AuthRequest = Request & { authUser?: AuthUser };
export const SESSION_COOKIE = 'htc_session';
export const GOOGLE_STATE_COOKIE = 'htc_google_state';
