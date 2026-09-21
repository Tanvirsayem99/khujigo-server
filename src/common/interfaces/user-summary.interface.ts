import { Admin, AdminRole, Customer } from '@prisma/client';

/**
 * The public shape of any account — staff or storefront customer. Shared by the
 * users module so the two identity tables can be listed side by side without
 * ever exposing a password hash.
 */
export type UserKind = 'ADMIN' | 'CUSTOMER';

export interface UserSummary {
  id: string;
  kind: UserKind;
  name: string;
  email: string;
  phone: string | null;
  /** `null` for customers — only staff accounts carry a role. */
  role: AdminRole | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export function toAdminUserSummary(admin: Admin): UserSummary {
  return {
    id: admin.id,
    kind: 'ADMIN',
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    avatarUrl: admin.avatarUrl,
    createdAt: admin.createdAt,
  };
}

export function toCustomerUserSummary(customer: Customer): UserSummary {
  return {
    id: customer.id,
    kind: 'CUSTOMER',
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    role: null,
    avatarUrl: null,
    createdAt: customer.createdAt,
  };
}
