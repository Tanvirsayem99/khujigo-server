import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { ROLES_KEY } from '../constants/auth.constants';

/**
 * Restricts an admin route to the listed roles. SUPER_ADMIN always passes,
 * mirroring `hasPermission()` in the storefront's AuthContext.
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
