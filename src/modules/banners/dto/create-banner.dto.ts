import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBannerDto {
  @ApiProperty({ example: 'Discover Trending Smart Gadgets in Bangladesh' })
  @IsString()
  titleEn!: string;

  @ApiProperty({ example: 'খুঁজে নিন বাংলাদেশের ট্রেন্ডিং গ্যাজেট!' })
  @IsString()
  titleBn!: string;

  @ApiProperty()
  @IsString()
  subtitleEn!: string;

  @ApiProperty()
  @IsString()
  subtitleBn!: string;

  @ApiProperty({ example: 'Shop Now' })
  @IsString()
  buttonTextEn!: string;

  @ApiProperty({ example: 'এখনই শপিং করুন' })
  @IsString()
  buttonTextBn!: string;

  @ApiProperty({ example: '/shop?filter=trending' })
  @IsString()
  buttonUrl!: string;

  @ApiProperty({ example: 'https://picsum.photos/seed/banner1/1200/500' })
  @IsString()
  imageUrl!: string;

  @ApiPropertyOptional({ example: 'Mega Trending Offer' })
  @IsOptional()
  @IsString()
  badgeEn?: string;

  @ApiPropertyOptional({ example: 'ট্রেন্ডিং ধামাকা অফার' })
  @IsOptional()
  @IsString()
  badgeBn?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
