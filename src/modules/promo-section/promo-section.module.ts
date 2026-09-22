import { Module } from '@nestjs/common';
import { PromoSectionController } from './promo-section.controller';
import { PromoSectionService } from './promo-section.service';

@Module({
  controllers: [PromoSectionController],
  providers: [PromoSectionService],
  exports: [PromoSectionService],
})
export class PromoSectionModule {}
