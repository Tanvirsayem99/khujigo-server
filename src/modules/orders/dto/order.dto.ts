import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { BD_PHONE_REGEX } from '../../auth/dto/customer-auth.dto';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'Product id' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'Zubair Hossain' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  customerName!: string;

  @ApiProperty({ example: '01712345678' })
  @Transform(({ value }) => String(value ?? '').trim())
  @Matches(BD_PHONE_REGEX, {
    message: 'customerPhone must be a valid 11-digit Bangladeshi mobile number',
  })
  customerPhone!: string;

  @ApiPropertyOptional({ example: 'zubair@example.com' })
  @IsOptional()
  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toLowerCase(),
  )
  @IsEmail()
  customerEmail?: string;

  @ApiProperty({ example: 'dhaka' })
  @IsString()
  @MinLength(1)
  division!: string;

  @ApiProperty({ example: 'dhaka-city' })
  @IsString()
  @MinLength(1)
  district!: string;

  @ApiProperty({ example: 'Dhanmondi' })
  @IsString()
  @MinLength(1)
  area!: string;

  @ApiProperty({ example: 'House #45, Road #7/A, Dhanmondi R/A, Dhaka' })
  @IsString()
  @MinLength(5)
  fullAddress!: string;

  @ApiPropertyOptional({ example: 'Please call before delivery' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNotes?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({ example: 'KHUJIGO100' })
  @IsOptional()
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  couponCode?: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.COD })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({
    description: 'bKash/Nagad transaction id, for manual payment verification',
    example: 'TRX8H2K9L1',
  })
  @IsOptional()
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MaxLength(60)
  paymentReference?: string;
}

/** Admin order listing filters. */
export class QueryOrdersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Matches order id, name, phone or email',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
