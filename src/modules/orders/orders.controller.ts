import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import {
  AdminAuth,
  CustomerAuth,
} from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public, OptionalAuth } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateOrderDto, QueryOrdersDto } from './dto/order.dto';
import {
  UpdateDeliveryChargeDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @OptionalAuth()
  @Post()
  @ApiOperation({ summary: 'Place an order (checkout)' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user?: AuthUser) {
    return this.ordersService.create(dto, user?.id);
  }

  @AdminAuth()
  @ApiBearerAuth()
  @Get()
  @ApiOperation({
    summary: 'Admin order listing with status, payment and search filters',
  })
  findAllForAdmin(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAllForAdmin(query);
  }

  @CustomerAuth()
  @ApiBearerAuth()
  @Get('mine')
  @ApiOperation({ summary: 'Orders belonging to the signed-in customer' })
  findMine(@CurrentUser() user: AuthUser, @Query() query: QueryOrdersDto) {
    return this.ordersService.findMine(user.id, query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Order receipt by order id' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @AdminAuth()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.STAFF)
  @ApiBearerAuth()
  @Patch(':id/status')
  @ApiOperation({ summary: 'Advance the fulfilment status of an order' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @AdminAuth()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.STAFF)
  @ApiBearerAuth()
  @Patch(':id/payment-status')
  @ApiOperation({ summary: 'Set the payment status of an order' })
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatus(id, dto.paymentStatus);
  }

  @AdminAuth()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.STAFF)
  @ApiBearerAuth()
  @Patch(':id/delivery-charge')
  @ApiOperation({
    summary: 'Confirm whether a COD delivery-charge advance was received',
  })
  updateDeliveryCharge(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryChargeDto,
  ) {
    return this.ordersService.updateDeliveryChargePaid(id, dto.paid);
  }

  @AdminAuth()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a cancelled order' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
