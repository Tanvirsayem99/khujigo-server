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
import { UpdateAdminRoleDto } from '../admins/dto/update-admin-role.dto';
import { UsersService } from './users.service';

/**
 * Account directory — every staff and customer account. Restricted to
 * SUPER_ADMIN for reads and writes; only staff accounts have an editable role.
 */
@ApiTags('Users')
@ApiBearerAuth()
@AdminAuth()
@Roles(AdminRole.SUPER_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List every account (staff and customers)',
    description:
      'Staff accounts come first with their role; customers follow with a null role.',
  })
  @ApiOkResponse({ description: 'Array of user summaries' })
  findAll() {
    return this.usersService.findAll();
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
    return this.usersService.updateUserRole(user.id, id, dto.role);
  }
}
