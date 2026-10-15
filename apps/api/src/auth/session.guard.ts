import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthRequest, SESSION_COOKIE } from './auth.types';
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth:AuthService) {}
  async canActivate(context:ExecutionContext):Promise<boolean> {
    const req=context.switchToHttp().getRequest<AuthRequest>();
    const user=await this.auth.fromToken((req as Request & {cookies?:Record<string,string>}).cookies?.[SESSION_COOKIE]);
    if(!user) throw new UnauthorizedException();
    req.authUser=user;
    return true;
  }
}
