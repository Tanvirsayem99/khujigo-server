import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AdminAuth } from '../../common/decorators/auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeliverySettingsService } from './delivery-settings.service';
import { UpdateDeliverySettingsDto } from './dto/update-delivery-settings.dto';

@ApiTags('Delivery settings')
@Controller('delivery-settings')
export class DeliverySettingsController {
  constructor(private readonly settingsService: DeliverySettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public delivery pricing used at checkout' })
  get() {
    return this.settingsService.get();
  }

  @AdminAuth()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth()
  @Patch()
  @ApiOperation({ summary: 'Update delivery pricing' })
  update(@Body() dto: UpdateDeliverySettingsDto) {
    return this.settingsService.update(dto);
  }
}
