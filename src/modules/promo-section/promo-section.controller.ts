import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AdminAuth } from '../../common/decorators/auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PromoSectionService } from './promo-section.service';
import { UpdatePromoSectionDto } from './dto/update-promo-section.dto';

@ApiTags('Promo section')
@Controller('promo-section')
export class PromoSectionController {
  constructor(private readonly promoSectionService: PromoSectionService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Homepage promo section state and its featured coupon',
  })
  get() {
    return this.promoSectionService.get();
  }

  @AdminAuth()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth()
  @Patch()
  @ApiOperation({
    summary: 'Show/hide the promo section, pick its coupon and custom copy',
  })
  update(@Body() dto: UpdatePromoSectionDto) {
    return this.promoSectionService.update(dto);
  }
}
