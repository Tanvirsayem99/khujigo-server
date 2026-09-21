import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateAdminRoleDto {
  @ApiProperty({ enum: AdminRole, example: AdminRole.ADMIN })
  @IsEnum(AdminRole, {
    message: `role must be one of: ${Object.values(AdminRole).join(', ')}`,
  })
  role!: AdminRole;
}
