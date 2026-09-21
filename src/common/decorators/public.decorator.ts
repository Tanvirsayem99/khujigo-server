import { SetMetadata } from '@nestjs/common';
import {
  IS_OPTIONAL_AUTH_KEY,
  IS_PUBLIC_KEY,
} from '../constants/auth.constants';

/** Marks a route as reachable without a token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Reachable without a token, but a valid customer token is honoured when one is
 * sent — lets guest and signed-in callers share an endpoint (checkout, reviews)
 * so the resulting row can be tied to an account.
 */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
