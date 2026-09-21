import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

// slug and sku stay optional-but-editable; everything else is patchable.
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, [] as const),
) {}

export class UpdateStockDto {
  @ApiProperty({ example: 25, description: 'Absolute new stock level' })
  @IsInt()
  @Min(0)
  stockQuantity!: number;
}
