import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AdminAuth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AdminsService } from './admins.service';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';

/**
 * Staff/user management. Restricted to SUPER_ADMIN for both reads and writes —
 * a non-super admin has no business seeing the staff list.
 */
@ApiTags('Admins')
@ApiBearerAuth()
@AdminAuth()
@Roles(AdminRole.SUPER_ADMIN)
@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  @ApiOperation({ summary: 'List every admin/staff account' })
  @ApiOkResponse({ description: 'Array of admin summaries' })
  findAll() {
    return this.adminsService.findAll();
  }

  @Patch(':id/role')
  @ApiOperation({
    summary: 'Change a staff member role (Super Admin only)',
    description:
      'Rejects changing your own role, and refuses to demote the last remaining Super Admin.',
  })
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdminRoleDto,
  ) {
    return this.adminsService.updateRole(user.id, id, dto.role);
  }
}
