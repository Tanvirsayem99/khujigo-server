import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface StoreAnalytics {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  deliveredOrders: number;
  lowStockCount: number;
  averageOrderValue: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<StoreAnalytics> {
    const [
      salesAggregate,
      totalOrders,
      totalProducts,
      totalCustomers,
      pendingOrders,
      deliveredOrders,
      lowStockRows,
    ] = await Promise.all([
      // Cancelled orders never count towards revenue.
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { orderStatus: { not: OrderStatus.CANCELLED } },
      }),
      this.prisma.order.count(),
      this.prisma.product.count(),
      this.prisma.customer.count(),
      this.prisma.order.count({ where: { orderStatus: OrderStatus.PENDING } }),
      this.prisma.order.count({
        where: { orderStatus: OrderStatus.DELIVERED },
      }),
      // Column-to-column comparison is not expressible in the Prisma query API.
      // Columns keep their Prisma (camelCase) names — only the table is mapped.
      this.prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "products"
        WHERE "stockQuantity" <= "lowStockThreshold"
      `,
    ]);

    const totalSales = salesAggregate._sum.totalAmount ?? 0;

    return {
      totalSales,
      totalOrders,
      totalProducts,
      totalCustomers,
      pendingOrders,
      deliveredOrders,
      lowStockCount: lowStockRows[0]?.count ?? 0,
      averageOrderValue:
        totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0,
    };
  }
}
