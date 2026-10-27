import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { clearSessionCookie, setSessionCookie } from '../auth/auth.cookies';
import { CredentialsDto } from '../auth/auth.dto';
import { AuthRequest, SESSION_COOKIE } from '../auth/auth.types';
import { AuthService } from '../auth/auth.service';
import { SessionGuard } from '../auth/session.guard';
import { AdminLoginThrottlerGuard } from './admin-login-throttler.guard';

@ApiTags('admin')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @UseGuards(AdminLoginThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() body: CredentialsDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.adminLogin(body.identifier, body.password);
    setSessionCookie(res, result.token, result.expiresAt);
    return { user: result.user };
  }

  @Get('me')
  @UseGuards(SessionGuard, AdminGuard)
  me(@Req() request: AuthRequest) {
    return { user: request.authUser };
  }

  @Post('logout')
  @UseGuards(SessionGuard, AdminGuard)
  async logout(@Req() request: AuthRequest, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(request.cookies?.[SESSION_COOKIE]);
    clearSessionCookie(res);
    return { ok: true };
  }
}
