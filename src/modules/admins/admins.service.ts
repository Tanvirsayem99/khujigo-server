import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminRole, TokenSubject } from '@prisma/client';
import {
  AdminSummary,
  toAdminSummary,
} from '../../common/interfaces/admin-summary.interface';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every staff account, oldest first so the founding Super Admin leads. */
  async findAll(): Promise<AdminSummary[]> {
    const admins = await this.prisma.admin.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
    return admins.map(toAdminSummary);
  }

  /**
   * Changes a staff member's role.
   *
   * Two guardrails, ordered so both are reachable:
   * 1. the org must always keep at least one Super Admin (a sole Super Admin
   *    demoting themselves hits this), and
   * 2. nobody may change their own role (reached when a second Super Admin
   *    exists).
   */
  async updateRole(
    actingAdminId: string,
    targetAdminId: string,
    role: AdminRole,
  ): Promise<AdminSummary> {
    const target = await this.prisma.admin.findUnique({
      where: { id: targetAdminId },
    });
    if (!target) {
      throw new NotFoundException(`Admin "${targetAdminId}" was not found`);
    }

    if (
      target.role === AdminRole.SUPER_ADMIN &&
      role !== AdminRole.SUPER_ADMIN
    ) {
      const superAdmins = await this.prisma.admin.count({
        where: { role: AdminRole.SUPER_ADMIN },
      });
      if (superAdmins <= 1) {
        throw new BadRequestException(
          'At least one Super Admin must remain, so this role cannot be changed.',
        );
      }
    }

    if (target.id === actingAdminId) {
      throw new BadRequestException(
        'You cannot change your own role. Ask another Super Admin to do it.',
      );
    }

    if (target.role === role) return toAdminSummary(target);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.admin.update({
        where: { id: targetAdminId },
        data: { role },
      });

      // The role travels inside the access token, so kill the target's refresh
      // tokens: they are signed out rather than silently keeping the old role
      // for the remainder of their session.
      await tx.refreshToken.updateMany({
        where: {
          subject: TokenSubject.ADMIN,
          subjectId: targetAdminId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      return toAdminSummary(updated);
    });
  }
}
