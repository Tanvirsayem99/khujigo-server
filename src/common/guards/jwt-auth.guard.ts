import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { TokenSubject } from '@prisma/client';
import {
  AUTH_TYPE_KEY,
  IS_OPTIONAL_AUTH_KEY,
  IS_PUBLIC_KEY,
} from '../constants/auth.constants';
import { JwtPayload } from '../interfaces/auth-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = [context.getHandler(), context.getClass()];

    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, metadata) ??
      false;
    const isOptional =
      this.reflector.getAllAndOverride<boolean>(
        IS_OPTIONAL_AUTH_KEY,
        metadata,
      ) ?? false;

    if (isPublic && !isOptional) return true;

    const required =
      this.reflector.getAllAndOverride<TokenSubject>(AUTH_TYPE_KEY, metadata) ??
      TokenSubject.CUSTOMER;

    const request = context.switchToHttp().getRequest();
    const token = this.extractBearerToken(request);

    // Optional routes fall through to guest access on any failure.
    if (!token) {
      if (isOptional) return true;
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
    } catch {
      if (isOptional) return true;
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.type !== required) {
      if (isOptional) return true;
      // The token is genuine, just not valid for this audience.
      throw new ForbiddenException(
        `This endpoint requires a ${required.toLowerCase()} token`,
      );
    }

    request.user = {
      id: payload.sub,
      type: payload.type,
      email: payload.email,
      role: payload.role,
    };

    return true;
  }

  private extractBearerToken(request: {
    headers?: Record<string, string | string[] | undefined>;
  }): string | null {
    const header = request.headers?.authorization;
    const value = Array.isArray(header) ? header[0] : header;
    if (!value) return null;

    const [scheme, token] = value.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
