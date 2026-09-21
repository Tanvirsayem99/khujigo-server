import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDeliverySettingsDto {
  @ApiPropertyOptional({
    example: 60,
    description: 'Charge inside Dhaka, in BDT',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  insideDhaka?: number;

  @ApiPropertyOptional({
    example: 120,
    description: 'Charge outside Dhaka, in BDT',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  outsideDhaka?: number;

  @ApiPropertyOptional({
    example: 2500,
    description: 'Order subtotal at or above which delivery is free',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  freeDeliveryThreshold?: number;

  @ApiPropertyOptional({ example: '1-2 Days' })
  @IsOptional()
  @IsString()
  estimatedDaysInsideDhaka?: string;

  @ApiPropertyOptional({ example: '2-4 Days' })
  @IsOptional()
  @IsString()
  estimatedDaysOutsideDhaka?: string;
}
