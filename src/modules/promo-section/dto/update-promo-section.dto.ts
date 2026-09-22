import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePromoSectionDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the promo section is visible on the storefront',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'clx123abc',
    nullable: true,
    description:
      'Coupon featured in the section; null hides the coupon details',
  })
  @IsOptional()
  @IsString()
  couponId?: string | null;

  @ApiPropertyOptional({ example: 'Get Flat ৳100 Off!', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  titleEn?: string | null;

  @ApiPropertyOptional({ example: 'ফ্ল্যাট ৳১০০ ছাড়!', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  titleBn?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  descriptionEn?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  descriptionBn?: string | null;
}
