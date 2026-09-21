import { Admin, AdminRole } from '@prisma/client';

/**
 * The public shape of an admin account. Shared by the auth module (a session
 * profile) and the admins module (the user-management list) so the two can
 * never drift apart.
 */
export interface AdminSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AdminRole;
  avatarUrl: string | null;
  createdAt: Date;
}

export function toAdminSummary(admin: Admin): AdminSummary {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    avatarUrl: admin.avatarUrl,
    createdAt: admin.createdAt,
  };
}
