import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product, ProductStatus } from '@prisma/client';
import { Paginated, paginate } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  ProductSort,
  QueryAdminProductsDto,
  QueryProductsDto,
} from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const CATEGORY_SELECT = {
  id: true,
  nameEn: true,
  nameBn: true,
  slug: true,
} satisfies Prisma.CategorySelect;

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: { select: typeof CATEGORY_SELECT } };
}>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Storefront listing — always scoped to ACTIVE products. */
  findAll(query: QueryProductsDto) {
    return this.list(query, ProductStatus.ACTIVE);
  }

  /** Admin listing — every status, optional status filter. */
  findAllForAdmin(query: QueryAdminProductsDto) {
    return this.list(query, query.status);
  }

  /**
   * Public product detail. Restricted to ACTIVE products so a DRAFT or ARCHIVED
   * product is never exposed by guessing its slug; admins read every status
   * through `GET /products/admin/all`.
   */
  async findOne(idOrSlug: string): Promise<ProductWithCategory> {
    const product = await this.prisma.product.findFirst({
      where: {
        status: ProductStatus.ACTIVE,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: { category: { select: CATEGORY_SELECT } },
    });
    if (!product) {
      throw new NotFoundException(`Product "${idOrSlug}" was not found`);
    }
    return product;
  }

  async findRelated(idOrSlug: string, limit = 4): Promise<Product[]> {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: { id: true, categoryId: true },
    });
    if (!product) {
      throw new NotFoundException(`Product "${idOrSlug}" was not found`);
    }

    return this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        status: ProductStatus.ACTIVE,
      },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 24),
    });
  }

  async create(dto: CreateProductDto): Promise<ProductWithCategory> {
    return this.prisma.product.create({
      data: {
        nameEn: dto.nameEn,
        nameBn: dto.nameBn,
        slug: dto.slug,
        sku: dto.sku,
        categoryId: dto.categoryId,
        brand: dto.brand,
        shortDescEn: dto.shortDescEn,
        shortDescBn: dto.shortDescBn,
        descriptionEn: dto.descriptionEn,
        descriptionBn: dto.descriptionBn,
        price: dto.price,
        comparePrice: dto.comparePrice ?? null,
        discountPercent: dto.discountPercent ?? null,
        stockQuantity: dto.stockQuantity,
        ...(dto.lowStockThreshold !== undefined
          ? { lowStockThreshold: dto.lowStockThreshold }
          : {}),
        thumbnailUrl: dto.thumbnailUrl,
        galleryUrls: dto.galleryUrls ?? [],
        ...(dto.status ? { status: dto.status } : {}),
        isFeatured: dto.isFeatured ?? false,
        isTrending: dto.isTrending ?? false,
        isBestSeller: dto.isBestSeller ?? false,
        isNewArrival: dto.isNewArrival ?? false,
        ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
        ...(dto.reviewsCount !== undefined
          ? { reviewsCount: dto.reviewsCount }
          : {}),
        specifications: this.toJsonSpecifications(dto.specifications),
        tags: dto.tags ?? [],
        seoTitle: dto.seoTitle ?? null,
        seoDescription: dto.seoDescription ?? null,
      },
      include: { category: { select: CATEGORY_SELECT } },
    });
  }

  async update(
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductWithCategory> {
    const data: Prisma.ProductUpdateInput = {};

    const assign = <K extends keyof UpdateProductDto>(
      key: K,
      column: keyof Prisma.ProductUpdateInput,
    ) => {
      if (dto[key] !== undefined) {
        (data as Record<string, unknown>)[column as string] = dto[key];
      }
    };

    assign('nameEn', 'nameEn');
    assign('nameBn', 'nameBn');
    assign('slug', 'slug');
    assign('sku', 'sku');
    assign('brand', 'brand');
    assign('shortDescEn', 'shortDescEn');
    assign('shortDescBn', 'shortDescBn');
    assign('descriptionEn', 'descriptionEn');
    assign('descriptionBn', 'descriptionBn');
    assign('price', 'price');
    assign('comparePrice', 'comparePrice');
    assign('discountPercent', 'discountPercent');
    assign('stockQuantity', 'stockQuantity');
    assign('lowStockThreshold', 'lowStockThreshold');
    assign('thumbnailUrl', 'thumbnailUrl');
    assign('galleryUrls', 'galleryUrls');
    assign('status', 'status');
    assign('isFeatured', 'isFeatured');
    assign('isTrending', 'isTrending');
    assign('isBestSeller', 'isBestSeller');
    assign('isNewArrival', 'isNewArrival');
    assign('rating', 'rating');
    assign('reviewsCount', 'reviewsCount');
    assign('tags', 'tags');
    assign('seoTitle', 'seoTitle');
    assign('seoDescription', 'seoDescription');

    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }
    if (dto.specifications !== undefined) {
      data.specifications = this.toJsonSpecifications(dto.specifications);
    }

    await this.assertExists(id);

    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: { select: CATEGORY_SELECT } },
    });
  }

  async updateStock(id: string, stockQuantity: number) {
    await this.assertExists(id);
    return this.prisma.product.update({
      where: { id },
      data: { stockQuantity },
    });
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.assertExists(id);
    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }

  // ------------------------------------------------------------------ helpers

  private async list(
    query: QueryProductsDto,
    status?: ProductStatus,
  ): Promise<Paginated<ProductWithCategory>> {
    const where = this.buildWhere(query, status);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: this.buildOrderBy(query.sort),
        skip: query.skip,
        take: query.limit,
        include: { category: { select: CATEGORY_SELECT } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  private buildWhere(
    query: QueryProductsDto,
    status?: ProductStatus,
  ): Prisma.ProductWhereInput {
    const filters: Prisma.ProductWhereInput[] = [];

    if (status) filters.push({ status });

    const search = query.search?.trim();
    if (search) {
      filters.push({
        OR: [
          { nameEn: { contains: search, mode: 'insensitive' } },
          { nameBn: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { tags: { has: search.toLowerCase() } },
        ],
      });
    }

    if (query.categorySlug) {
      filters.push({ category: { slug: query.categorySlug } });
    }
    if (query.categoryId) {
      filters.push({ categoryId: query.categoryId });
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filters.push({
        price: {
          ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
          ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
        },
      });
    }

    if (query.trending) filters.push({ isTrending: true });
    if (query.bestSeller) filters.push({ isBestSeller: true });
    if (query.newArrival) filters.push({ isNewArrival: true });
    if (query.featured) filters.push({ isFeatured: true });
    if (query.inStock) filters.push({ stockQuantity: { gt: 0 } });
    if (query.onSale) filters.push({ discountPercent: { gt: 0 } });

    return filters.length > 0 ? { AND: filters } : {};
  }

  private buildOrderBy(
    sort: ProductSort,
  ): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case ProductSort.PRICE_ASC:
        return [{ price: 'asc' }];
      case ProductSort.PRICE_DESC:
        return [{ price: 'desc' }];
      case ProductSort.RATING:
        return [{ rating: 'desc' }, { reviewsCount: 'desc' }];
      case ProductSort.TRENDING:
        return [{ isTrending: 'desc' }, { rating: 'desc' }];
      case ProductSort.DISCOUNT:
        return [{ discountPercent: 'desc' }];
      case ProductSort.NEWEST:
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  private toJsonSpecifications(
    specifications?: CreateProductDto['specifications'],
  ): Prisma.InputJsonValue {
    return (specifications ?? []) as unknown as Prisma.InputJsonValue;
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.product.count({ where: { id } });
    if (exists === 0) {
      throw new NotFoundException(`Product "${id}" was not found`);
    }
  }
}
