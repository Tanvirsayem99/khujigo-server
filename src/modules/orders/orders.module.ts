import { Module } from '@nestjs/common';
import { CouponsModule } from '../coupons/coupons.module';
import { DeliverySettingsModule } from '../delivery-settings/delivery-settings.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [CouponsModule, DeliverySettingsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
