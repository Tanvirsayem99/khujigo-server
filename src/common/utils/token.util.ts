import { createHash, randomUUID } from 'node:crypto';

/** Refresh tokens are stored hashed so a DB leak cannot be replayed. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newTokenId(): string {
  return randomUUID();
}
