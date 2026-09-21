import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Review, ReviewStatus } from '@prisma/client';
import { Paginated, paginate } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateReviewDto,
  QueryAdminReviewsDto,
  QueryReviewsDto,
} from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public feed. Only APPROVED reviews are ever visible here, optionally
   * narrowed to a single product.
   */
  findPublic(query: QueryReviewsDto): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: {
        status: ReviewStatus.APPROVED,
        ...(query.productId ? { productId: query.productId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });
  }

  /** Moderation queue — every status. */
  async findAllForAdmin(
    query: QueryAdminReviewsDto,
  ): Promise<Paginated<Review>> {
    const where: Prisma.ReviewWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.productId) where.productId = query.productId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  /**
   * Submitted reviews start as PENDING and wait for moderation, so the admin
   * approve/reject queue is actually populated (the old client auto-approved).
   */
  async create(dto: CreateReviewDto, customerId?: string): Promise<Review> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, nameEn: true },
    });
    if (!product) {
      throw new NotFoundException(`Product "${dto.productId}" was not found`);
    }

    return this.prisma.review.create({
      data: {
        productId: product.id,
        productName: product.nameEn,
        customerId: customerId ?? null,
        customerName: dto.customerName.trim(),
        rating: dto.rating,
        comment: dto.comment.trim(),
        status: ReviewStatus.PENDING,
      },
    });
  }

  async updateStatus(id: string, status: ReviewStatus): Promise<Review> {
    await this.assertExists(id);
    return this.prisma.review.update({ where: { id }, data: { status } });
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.assertExists(id);
    await this.prisma.review.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.review.count({ where: { id } });
    if (exists === 0) {
      throw new NotFoundException(`Review "${id}" was not found`);
    }
  }
}
