import { Injectable, NotFoundException } from '@nestjs/common';
import { Coupon, DiscountType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCouponDto } from './dto/coupon.dto';

/**
 * Machine-readable failure reasons so clients can localise the message instead
 * of string-matching the English `message`.
 */
export type CouponRejectionReason =
  'INVALID' | 'NOT_STARTED' | 'EXPIRED' | 'USAGE_LIMIT' | 'MIN_ORDER';

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  /** Present only when `valid` is false. */
  reason?: CouponRejectionReason;
  /** Present for a `MIN_ORDER` rejection, so clients can localise the amount. */
  minOrderAmount?: number;
  coupon?: Coupon;
  discount?: number;
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Server-authoritative coupon check. Beyond the original client-side logic
   * this also enforces the validity window and the redemption limit, which the
   * old in-memory version ignored.
   */
  async validate(
    code: string,
    subtotal: number,
  ): Promise<CouponValidationResult> {
    const normalized = code.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: normalized },
    });

    if (!coupon || !coupon.isActive) {
      return {
        valid: false,
        reason: 'INVALID',
        message: 'Invalid coupon code',
      };
    }

    const now = new Date();
    if (now < coupon.startDate) {
      return {
        valid: false,
        reason: 'NOT_STARTED',
        message: 'This coupon is not active yet',
      };
    }
    if (now > coupon.expiryDate) {
      return {
        valid: false,
        reason: 'EXPIRED',
        message: 'This coupon has expired',
      };
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return {
        valid: false,
        reason: 'USAGE_LIMIT',
        message: 'This coupon has reached its usage limit',
      };
    }
    if (subtotal < coupon.minOrderAmount) {
      return {
        valid: false,
        reason: 'MIN_ORDER',
        minOrderAmount: coupon.minOrderAmount,
        message: `Minimum order amount of ৳${coupon.minOrderAmount} is required`,
      };
    }

    let discount =
      coupon.discountType === DiscountType.FIXED
        ? coupon.discountValue
        : (subtotal * coupon.discountValue) / 100;

    if (
      coupon.maxDiscountAmount !== null &&
      discount > coupon.maxDiscountAmount
    ) {
      discount = coupon.maxDiscountAmount;
    }

    // A discount may never exceed the subtotal itself.
    const rounded = Math.min(Math.round(discount), subtotal);

    return {
      valid: true,
      coupon,
      discount: rounded,
      message: 'Coupon applied successfully',
    };
  }

  findAll(): Promise<Coupon[]> {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateCouponDto): Promise<Coupon> {
    const data: Prisma.CouponCreateInput = {
      code: dto.code.trim().toUpperCase(),
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minOrderAmount: dto.minOrderAmount ?? 0,
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      usageLimit: dto.usageLimit ?? 0,
      startDate: new Date(dto.startDate),
      expiryDate: new Date(dto.expiryDate),
      isActive: dto.isActive ?? true,
    };
    return this.prisma.coupon.create({ data });
  }

  async toggle(id: string): Promise<Coupon> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException(`Coupon "${id}" was not found`);

    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
    });
  }

  async remove(id: string): Promise<{ success: true }> {
    const exists = await this.prisma.coupon.count({ where: { id } });
    if (exists === 0) {
      throw new NotFoundException(`Coupon "${id}" was not found`);
    }
    await this.prisma.coupon.delete({ where: { id } });
    return { success: true };
  }
}
