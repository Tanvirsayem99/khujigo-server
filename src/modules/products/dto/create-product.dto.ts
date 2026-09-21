import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class SpecificationDto {
  @ApiProperty({ example: 'Battery' })
  @IsString()
  keyEn!: string;

  @ApiProperty({ example: 'ব্যাটারি' })
  @IsString()
  keyBn!: string;

  @ApiProperty({ example: '7200mAh Lithium-ion' })
  @IsString()
  valueEn!: string;

  @ApiProperty({ example: '৭২০০ মিলিঅ্যাম্পিয়ার' })
  @IsString()
  valueBn!: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'T900 Ultra 2 Smartwatch' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nameEn!: string;

  @ApiProperty({ example: 'T900 আল্ট্রা ২ স্মার্টওয়াচ' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nameBn!: string;

  @ApiProperty({ example: 't900-ultra-2-smartwatch' })
  @IsString()
  @MaxLength(200)
  slug!: string;

  @ApiProperty({ example: 'KG-WAT-001' })
  @IsString()
  @MaxLength(60)
  sku!: string;

  @ApiProperty({ description: 'Category cuid' })
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: 'KhujiGo Select' })
  @IsString()
  @MaxLength(120)
  brand!: string;

  @ApiProperty()
  @IsString()
  shortDescEn!: string;

  @ApiProperty()
  @IsString()
  shortDescBn!: string;

  @ApiProperty()
  @IsString()
  descriptionEn!: string;

  @ApiProperty()
  @IsString()
  descriptionBn!: string;

  @ApiProperty({ description: 'Whole BDT taka', example: 1450 })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 2200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  comparePrice?: number;

  @ApiPropertyOptional({ example: 34 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiProperty({ example: 48 })
  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiProperty()
  @IsString()
  thumbnailUrl!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryUrls?: string[];

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTrending?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBestSeller?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;

  @ApiPropertyOptional({ example: 4.8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 128 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reviewsCount?: number;

  @ApiPropertyOptional({ type: [SpecificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecificationDto)
  specifications?: SpecificationDto[];

  @ApiPropertyOptional({ type: [String], example: ['smartwatch', 'trending'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;
}
