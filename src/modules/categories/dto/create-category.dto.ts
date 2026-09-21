import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Gadgets & Tech' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameEn!: string;

  @ApiProperty({ example: 'গ্যাজেট ও টেকনোলজি' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameBn!: string;

  @ApiProperty({ example: 'gadgets' })
  @IsString()
  @MaxLength(120)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionBn?: string;

  @ApiProperty({ example: 'https://picsum.photos/seed/gadgetscat/400/400' })
  @IsString()
  imageUrl!: string;

  @ApiPropertyOptional({ example: 'Watch' })
  @IsOptional()
  @IsString()
  icon?: string;

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
