import { AdminRole, TokenSubject } from '@prisma/client';

/** Claims carried by both access and refresh tokens. */
export interface JwtPayload {
  /** Subject id — customer or admin id. */
  sub: string;
  type: TokenSubject;
  email: string;
  /** Present only for admin tokens. */
  role?: AdminRole;
  /**
   * Unique id on refresh tokens. Two logins in the same second would otherwise
   * produce byte-identical tokens and collide on the stored hash.
   */
  jti?: string;
}

/** Shape attached to `request.user` once a token is verified. */
export interface AuthUser {
  id: string;
  type: TokenSubject;
  email: string;
  role?: AdminRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
