import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthRequest } from '../auth/auth.types';

/**
 * Rate limit theo tài khoản đã đăng nhập để một người không đốt quota Gemini.
 * Guard này phải chạy sau SessionGuard để `authUser` đã có trên request.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const authUser = (req as unknown as AuthRequest).authUser;
    if (authUser?.id) return `user:${authUser.id}`;
    const ip = (req as { ip?: string }).ip;
    return `ip:${ip ?? 'unknown'}`;
  }
}
