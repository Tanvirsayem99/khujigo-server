import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export type CategoryWithCount = Omit<Category, never> & {
  productCount: number;
};

/** Storefront counts: only products a shopper can actually see. */
const COUNT_ACTIVE = {
  _count: {
    select: { products: { where: { status: ProductStatus.ACTIVE } } },
  },
} satisfies Prisma.CategoryInclude;

/** Admin counts: everything, including DRAFT and ARCHIVED. */
const COUNT_ALL = {
  _count: { select: { products: true } },
} satisfies Prisma.CategoryInclude;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Storefront: active categories only, in display order, counting visible
   * products. Admin: every category, counting all products.
   */
  async findAll(includeInactive = false): Promise<CategoryWithCount[]> {
    const rows = await this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: includeInactive ? COUNT_ALL : COUNT_ACTIVE,
    });
    return rows.map((row) => this.toDto(row));
  }

  async findBySlug(slug: string): Promise<CategoryWithCount> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: COUNT_ACTIVE,
    });
    if (!category) {
      throw new NotFoundException(`Category "${slug}" was not found`);
    }
    return this.toDto(category);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryWithCount> {
    const category = await this.prisma.category.create({
      data: {
        nameEn: dto.nameEn,
        nameBn: dto.nameBn,
        slug: dto.slug,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionBn: dto.descriptionBn ?? null,
        imageUrl: dto.imageUrl,
        icon: dto.icon ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: COUNT_ALL,
    });
    return this.toDto(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryWithCount> {
    await this.assertExists(id);

    const data: Prisma.CategoryUpdateInput = {};
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.nameBn !== undefined) data.nameBn = dto.nameBn;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.descriptionBn !== undefined) data.descriptionBn = dto.descriptionBn;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const category = await this.prisma.category.update({
      where: { id },
      data,
      include: COUNT_ALL,
    });
    return this.toDto(category);
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.assertExists(id);

    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete this category while ${productCount} product(s) still reference it`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.category.count({ where: { id } });
    if (exists === 0) {
      throw new NotFoundException(`Category "${id}" was not found`);
    }
  }

  private toDto(
    category: Category & { _count: { products: number } },
  ): CategoryWithCount {
    const { _count, ...rest } = category;
    return { ...rest, productCount: _count.products };
  }
}
