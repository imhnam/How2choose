import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { isEmail } from 'class-validator';
const scrypt = promisify(scryptCallback);
export function normalizeIdentifier(input: string): { email?: string; phone?: string } {
  const value = input.trim();
  if (value.includes('@')) {
    const email = value.toLowerCase();
    if (!isEmail(email) || email.length > 254) throw new Error('Invalid email');
    return { email };
  }
  const phone = value.replace(/[\s()-]/g, '');
  const normalized = /^0\d{9}$/.test(phone) ? '+84' + phone.slice(1) : phone;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw new Error('Invalid phone number; use 0xxxxxxxxx or E.164');
  return { phone: normalized };
}
export async function hashPassword(password: string): Promise<string> {
  const salt=randomBytes(16).toString('hex');
  const hash=(await scrypt(password,salt,64)) as Buffer;
  return salt+':'+hash.toString('hex');
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt,hex]=stored.split(':');
  if (!salt || !hex || !/^[0-9a-f]{128}$/.test(hex)) return false;
  const actual=(await scrypt(password,salt,64)) as Buffer;
  return timingSafeEqual(actual,Buffer.from(hex,'hex'));
}
export function newToken(): string { return randomBytes(32).toString('base64url'); }
export function tokenHash(token: string): string { return createHash('sha256').update(token).digest('hex'); }
