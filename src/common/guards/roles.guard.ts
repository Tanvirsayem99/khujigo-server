import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole, TokenSubject } from '@prisma/client';
import { ROLES_KEY } from '../constants/auth.constants';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: AuthUser | undefined = context.switchToHttp().getRequest().user;
    if (!user || user.type !== TokenSubject.ADMIN || !user.role) return false;

    // Super admins bypass every role check.
    if (user.role === AdminRole.SUPER_ADMIN) return true;

    return required.includes(user.role);
  }
}
