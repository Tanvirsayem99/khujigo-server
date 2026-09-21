import { Injectable, NotFoundException } from '@nestjs/common';
import { Banner, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false): Promise<Banner[]> {
    return this.prisma.banner.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  create(dto: CreateBannerDto): Promise<Banner> {
    return this.prisma.banner.create({
      data: {
        titleEn: dto.titleEn,
        titleBn: dto.titleBn,
        subtitleEn: dto.subtitleEn,
        subtitleBn: dto.subtitleBn,
        buttonTextEn: dto.buttonTextEn,
        buttonTextBn: dto.buttonTextBn,
        buttonUrl: dto.buttonUrl,
        imageUrl: dto.imageUrl,
        badgeEn: dto.badgeEn ?? null,
        badgeBn: dto.badgeBn ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateBannerDto): Promise<Banner> {
    await this.assertExists(id);

    const data: Prisma.BannerUpdateInput = {};
    if (dto.titleEn !== undefined) data.titleEn = dto.titleEn;
    if (dto.titleBn !== undefined) data.titleBn = dto.titleBn;
    if (dto.subtitleEn !== undefined) data.subtitleEn = dto.subtitleEn;
    if (dto.subtitleBn !== undefined) data.subtitleBn = dto.subtitleBn;
    if (dto.buttonTextEn !== undefined) data.buttonTextEn = dto.buttonTextEn;
    if (dto.buttonTextBn !== undefined) data.buttonTextBn = dto.buttonTextBn;
    if (dto.buttonUrl !== undefined) data.buttonUrl = dto.buttonUrl;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.badgeEn !== undefined) data.badgeEn = dto.badgeEn;
    if (dto.badgeBn !== undefined) data.badgeBn = dto.badgeBn;
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.banner.update({ where: { id }, data });
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.assertExists(id);
    await this.prisma.banner.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.banner.count({ where: { id } });
    if (exists === 0) {
      throw new NotFoundException(`Banner "${id}" was not found`);
    }
  }
}
