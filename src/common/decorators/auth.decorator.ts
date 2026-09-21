import { SetMetadata } from '@nestjs/common';
import { TokenSubject } from '@prisma/client';
import { AUTH_TYPE_KEY } from '../constants/auth.constants';

/**
 * Declares which audience a route expects. Without it a non-public route
 * defaults to CUSTOMER (fail closed).
 */
export const Auth = (type: TokenSubject) => SetMetadata(AUTH_TYPE_KEY, type);

export const CustomerAuth = () => Auth(TokenSubject.CUSTOMER);
export const AdminAuth = () => Auth(TokenSubject.ADMIN);
