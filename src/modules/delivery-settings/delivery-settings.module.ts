import { Module } from '@nestjs/common';
import { DeliverySettingsController } from './delivery-settings.controller';
import { DeliverySettingsService } from './delivery-settings.service';

@Module({
  controllers: [DeliverySettingsController],
  providers: [DeliverySettingsService],
  exports: [DeliverySettingsService],
})
export class DeliverySettingsModule {}
