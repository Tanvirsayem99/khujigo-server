import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  ProductStatus,
} from '@prisma/client';
import { Paginated, paginate } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { DeliverySettingsService } from '../delivery-settings/delivery-settings.service';
import { CreateOrderDto, QueryOrdersDto } from './dto/order.dto';

const ORDER_INCLUDE = { items: true } satisfies Prisma.OrderInclude;
const MAX_ORDER_ID_ATTEMPTS = 5;

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

interface OrderLine {
  productId: string;
  nameEn: string;
  nameBn: string;
  thumbnailUrl: string;
  price: number;
  quantity: number;
  total: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponsService: CouponsService,
    private readonly deliverySettings: DeliverySettingsService,
  ) {}

  /**
   * Checkout. Every amount is recomputed here from the database — nothing
   * money-related is taken from the request body.
   */
  async create(
    dto: CreateOrderDto,
    authenticatedCustomerId?: string,
  ): Promise<OrderWithItems> {
    const lines = await this.buildLines(dto);

    const subtotal = lines.reduce((sum, line) => sum + line.total, 0);

    let discount = 0;
    let couponId: string | null = null;
    let couponCode: string | null = null;
    if (dto.couponCode?.trim()) {
      const result = await this.couponsService.validate(
        dto.couponCode,
        subtotal,
      );
      if (!result.valid) {
        // Carry the machine-readable reason so clients can localise the message.
        throw new BadRequestException({
          message: result.message,
          reason: result.reason,
          minOrderAmount: result.minOrderAmount,
        });
      }
      discount = result.discount ?? 0;
      couponId = result.coupon?.id ?? null;
      couponCode = result.coupon?.code ?? null;
    }

    const settings = await this.deliverySettings.get();
    const deliveryCharge = this.deliverySettings.chargeFor(
      settings,
      subtotal,
      dto.division,
    );
    const totalAmount = Math.max(0, subtotal + deliveryCharge - discount);

    // A signed-in customer owns the order outright; otherwise attach it to an
    // account whose email/phone match, so guest orders still appear in "my orders".
    const customer = authenticatedCustomerId
      ? { id: authenticatedCustomerId }
      : await this.findMatchingCustomer(dto.customerEmail, dto.customerPhone);

    const orderData = {
      customerId: customer?.id ?? null,
      customerName: dto.customerName.trim(),
      customerPhone: dto.customerPhone.trim(),
      customerEmail: dto.customerEmail ?? null,
      division: dto.division,
      district: dto.district,
      area: dto.area,
      fullAddress: dto.fullAddress,
      deliveryNotes: dto.deliveryNotes ?? null,
      subtotal,
      deliveryCharge,
      discount,
      couponCode,
      totalAmount,
      paymentMethod: dto.paymentMethod,
      paymentReference: dto.paymentReference || null,
      // Never trust the client to declare a payment settled — staff verify it.
      paymentStatus: PaymentStatus.UNPAID,
      orderStatus: OrderStatus.PENDING,
    };

    for (let attempt = 0; attempt < MAX_ORDER_ID_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const id = await this.nextOrderId(tx);

          // Atomic stock guard: decrement only when enough stock remains, so
          // two concurrent checkouts cannot oversell the last unit.
          for (const line of lines) {
            const updated = await tx.product.updateMany({
              where: {
                id: line.productId,
                stockQuantity: { gte: line.quantity },
                status: ProductStatus.ACTIVE,
              },
              data: { stockQuantity: { decrement: line.quantity } },
            });
            if (updated.count === 0) {
              throw new ConflictException(
                `"${line.nameEn}" is no longer available in the requested quantity`,
              );
            }
          }

          const order = await tx.order.create({
            data: { id, ...orderData, items: { create: lines } },
            include: ORDER_INCLUDE,
          });

          if (couponId) {
            await tx.coupon.update({
              where: { id: couponId },
              data: { usedCount: { increment: 1 } },
            });
          }

          return order;
        });
      } catch (error) {
        const collision =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          Array.isArray(error.meta?.target) &&
          (error.meta.target as string[]).includes('id');

        if (collision && attempt < MAX_ORDER_ID_ATTEMPTS - 1) continue;
        throw error;
      }
    }

    throw new ConflictException('Could not allocate an order id, please retry');
  }

  async findOne(id: string): Promise<OrderWithItems> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException(`Order "${id}" was not found`);
    }
    return order;
  }

  /** Orders belonging to the signed-in customer, matched by id, email or phone. */
  async findMine(
    customerId: string,
    query: QueryOrdersDto,
  ): Promise<Paginated<OrderWithItems>> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { email: true, phone: true },
    });
    if (!customer) {
      throw new NotFoundException('Account no longer exists');
    }

    return this.list(
      {
        OR: [
          { customerId },
          { customerEmail: customer.email },
          { customerPhone: customer.phone },
        ],
      },
      query,
    );
  }

  async findAllForAdmin(
    query: QueryOrdersDto,
  ): Promise<Paginated<OrderWithItems>> {
    const filters: Prisma.OrderWhereInput[] = [];

    if (query.status) filters.push({ orderStatus: query.status });
    if (query.paymentStatus)
      filters.push({ paymentStatus: query.paymentStatus });

    const search = query.search?.trim();
    if (search) {
      filters.push({
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search } },
          { customerEmail: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    return this.list(filters.length > 0 ? { AND: filters } : {}, query);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<OrderWithItems> {
    await this.assertExists(id);
    return this.prisma.order.update({
      where: { id },
      data: { orderStatus: status },
      include: ORDER_INCLUDE,
    });
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
  ): Promise<OrderWithItems> {
    await this.assertExists(id);
    return this.prisma.order.update({
      where: { id },
      data: { paymentStatus },
      include: ORDER_INCLUDE,
    });
  }

  /** Staff confirmation that a COD order's delivery-charge advance arrived. */
  async updateDeliveryChargePaid(
    id: string,
    paid: boolean,
  ): Promise<OrderWithItems> {
    await this.assertExists(id);
    return this.prisma.order.update({
      where: { id },
      data: { deliveryChargePaid: paid },
      include: ORDER_INCLUDE,
    });
  }

  /**
   * Hard-deletes a cancelled order and its line items. Only cancelled orders
   * may be removed so live fulfilment records cannot be destroyed by mistake.
   */
  async remove(id: string): Promise<{ id: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { orderStatus: true },
    });
    if (!order) {
      throw new NotFoundException(`Order "${id}" was not found`);
    }
    if (order.orderStatus !== OrderStatus.CANCELLED) {
      throw new BadRequestException('Only cancelled orders can be deleted');
    }

    await this.prisma.order.delete({ where: { id } });
    return { id };
  }

  // ------------------------------------------------------------------ helpers

  /** Collapses duplicate product ids and prices the lines from the database. */
  private async buildLines(dto: CreateOrderDto): Promise<OrderLine[]> {
    const quantityByProduct = new Map<string, number>();
    for (const item of dto.items) {
      quantityByProduct.set(
        item.productId,
        (quantityByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const productIds = [...quantityByProduct.keys()];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    for (const productId of productIds) {
      if (!byId.has(productId)) {
        throw new NotFoundException(`Product "${productId}" was not found`);
      }
    }

    return productIds.map((productId) => {
      const product = byId.get(productId)!;
      const quantity = quantityByProduct.get(productId)!;

      if (product.status !== ProductStatus.ACTIVE) {
        throw new BadRequestException(
          `"${product.nameEn}" is not available for purchase`,
        );
      }
      if (product.stockQuantity < quantity) {
        throw new ConflictException(
          `Only ${product.stockQuantity} unit(s) of "${product.nameEn}" are in stock`,
        );
      }

      return {
        productId,
        nameEn: product.nameEn,
        nameBn: product.nameBn,
        thumbnailUrl: product.thumbnailUrl,
        price: product.price,
        quantity,
        total: product.price * quantity,
      };
    });
  }

  private findMatchingCustomer(
    email: string | undefined,
    phone: string,
  ): Promise<{ id: string } | null> {
    const matches: Prisma.CustomerWhereInput[] = [{ phone: phone.trim() }];
    if (email) matches.push({ email: email.trim().toLowerCase() });

    return this.prisma.customer.findFirst({
      where: { OR: matches },
      select: { id: true },
    });
  }

  private async nextOrderId(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const id = `KG-${year}-${randomInt(1000, 10000)}`;
      const taken = await tx.order.count({ where: { id } });
      if (taken === 0) return id;
    }
    throw new ConflictException('Unable to allocate an order id');
  }

  private async list(
    where: Prisma.OrderWhereInput,
    query: QueryOrdersDto,
  ): Promise<Paginated<OrderWithItems>> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.order.count({ where: { id } });
    if (exists === 0) {
      throw new NotFoundException(`Order "${id}" was not found`);
    }
  }
}
