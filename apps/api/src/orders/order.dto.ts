import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class OrderLineDto {
  @IsString()
  @MaxLength(100)
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class OrderQuoteDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items!: OrderLineDto[];

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/\S/)
  recipientName!: string;

  @IsString()
  @Matches(/^(?:0\d{9}|\+84\d{9})$/)
  phone!: string;

  @IsIn(['legacy', 'current'])
  addressVersion!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  provinceCode!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  districtCode?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  wardCode!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Matches(/\S/)
  addressLine!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  deliveryNote?: string;
}

export class CreateOrderDto extends OrderQuoteDto {
  @IsString()
  @MaxLength(4096)
  quoteToken!: string;
}