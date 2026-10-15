import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthRequest } from '../auth/auth.types';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (request.authUser?.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ quản trị viên được thay đổi media sản phẩm.');
    }
    return true;
  }
}
