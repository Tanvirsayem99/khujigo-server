import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdatePromoSectionDto } from './dto/update-promo-section.dto';

const PROMO_ID = 'default';

const PROMO_INCLUDE = { coupon: true } satisfies Prisma.PromoSectionInclude;

export type PromoSectionWithCoupon = Prisma.PromoSectionGetPayload<{
  include: typeof PROMO_INCLUDE;
}>;

@Injectable()
export class PromoSectionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lazily creates the singleton so a fresh database never 404s the storefront. */
  async get(): Promise<PromoSectionWithCoupon> {
    const existing = await this.prisma.promoSection.findUnique({
      where: { id: PROMO_ID },
      include: PROMO_INCLUDE,
    });
    if (existing) return existing;

    return this.prisma.promoSection.create({
      data: { id: PROMO_ID },
      include: PROMO_INCLUDE,
    });
  }

  async update(dto: UpdatePromoSectionDto): Promise<PromoSectionWithCoupon> {
    await this.get();

    if (typeof dto.couponId === 'string') {
      const coupon = await this.prisma.coupon.count({
        where: { id: dto.couponId },
      });
      if (coupon === 0) {
        throw new NotFoundException(`Coupon "${dto.couponId}" was not found`);
      }
    }

    const data: Prisma.PromoSectionUpdateInput = {};
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.couponId !== undefined) {
      data.coupon = dto.couponId
        ? { connect: { id: dto.couponId } }
        : { disconnect: true };
    }
    if (dto.titleEn !== undefined) data.titleEn = dto.titleEn;
    if (dto.titleBn !== undefined) data.titleBn = dto.titleBn;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.descriptionBn !== undefined) data.descriptionBn = dto.descriptionBn;

    return this.prisma.promoSection.update({
      where: { id: PROMO_ID },
      data,
      include: PROMO_INCLUDE,
    });
  }
}
