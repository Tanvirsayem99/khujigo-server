import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
  @ApiProperty({ example: 'EID2026' })
  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toUpperCase(),
  )
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code!: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiProperty({
    example: 10,
    description: 'Percentage (0-100) when PERCENTAGE, otherwise whole BDT',
  })
  @IsInt()
  @Min(0)
  discountValue!: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({
    example: 300,
    description: 'Cap for PERCENTAGE coupons',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Maximum redemptions; 0 means unlimited',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  usageLimit?: number;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-04-30T23:59:59.000Z' })
  @IsDateString()
  expiryDate!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ValidateCouponDto {
  @ApiProperty({ example: 'KHUJIGO100' })
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  code!: string;

  @ApiProperty({ example: 2300, description: 'Cart subtotal in whole BDT' })
  @IsInt()
  @Min(0)
  subtotal!: number;
}
