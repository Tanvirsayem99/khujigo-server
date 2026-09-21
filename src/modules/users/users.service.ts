import { Injectable } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import {
  UserSummary,
  toAdminUserSummary,
  toCustomerUserSummary,
} from '../../common/interfaces/user-summary.interface';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AdminsService } from '../admins/admins.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly admins: AdminsService,
  ) {}

  /**
   * Every account in the system: staff first (so the rows a Super Admin can
   * actually manage sit on top), then storefront customers newest-first.
   */
  async findAll(): Promise<UserSummary[]> {
    const [admins, customers] = await Promise.all([
      this.prisma.admin.findMany({
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.customer.findMany({ orderBy: [{ createdAt: 'desc' }] }),
    ]);

    return [
      ...admins.map(toAdminUserSummary),
      ...customers.map(toCustomerUserSummary),
    ];
  }

  /**
   * Role changes stay owned by AdminsService so the guardrails (last Super
   * Admin, no self change) and refresh-token revocation live in one place. The
   * returned summary is re-shaped with `kind` so it matches the list endpoint.
   */
  async updateUserRole(
    actingAdminId: string,
    targetAdminId: string,
    role: AdminRole,
  ): Promise<UserSummary> {
    const updated = await this.admins.updateRole(
      actingAdminId,
      targetAdminId,
      role,
    );
    return { ...updated, kind: 'ADMIN' };
  }
}
