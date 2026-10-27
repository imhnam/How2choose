import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export const SHIPPING_REGIONS = ['ALL', 'HN', 'HCM', 'DN'] as const;
export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'PAYMENT_FAILED',
  'CANCELLED',
  'EXPIRED',
  'PAYMENT_REVIEW',
] as const;

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const upper = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value;

export class AdminPageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() @MaxLength(160) q?: string;
}

export class AdminProductQueryDto extends AdminPageQueryDto {
  @IsOptional() @IsIn(['all', 'active', 'inactive']) status?: 'all' | 'active' | 'inactive';
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsIn(['updatedAt', 'createdAt', 'name', 'price']) sort?: 'updatedAt' | 'createdAt' | 'name' | 'price';
}

export class AdminOrderQueryDto extends AdminPageQueryDto {
  @IsOptional() @IsIn(ORDER_STATUSES) status?: typeof ORDER_STATUSES[number];
}

export class CreateCategoryDto {
  @Transform(trim) @IsString() @Length(2, 120) name!: string;
  @IsOptional() @Transform(trim) @IsString() @Length(2, 120) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) description?: string | null;
  @IsOptional() @IsString() parentId?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class CreateProductDto {
  @Transform(trim) @IsString() @Length(2, 160) name!: string;
  @IsOptional() @Transform(trim) @IsString() @Length(2, 120) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug?: string;
  @Transform(trim) @IsString() @Length(1, 5000) description!: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000_000) priceVnd!: number;
  @IsOptional() @Transform(({ value }) => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item.trim() : item).filter(Boolean) : value)
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 40, { each: true }) tags?: string[];
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) brand?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) supplier?: string | null;
  @IsOptional() @Transform(({ value }) => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item.trim().toUpperCase() : item) : value)
  @IsArray() @ArrayUnique() @ArrayMinSize(1) @IsIn(SHIPPING_REGIONS, { each: true }) shippingRegions?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) discountPercent?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000_000) discountAmountVnd?: number | null;
  @IsOptional() @IsArray() @ArrayUnique() @ArrayMaxSize(30) @IsString({ each: true }) categoryIds?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class CreateVariantDto {
  @Transform(upper) @IsString() @Length(2, 64) @Matches(/^[A-Z0-9][A-Z0-9._-]*$/) sku!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) name?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) color?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) size?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) material?: string | null;
  @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000_000) priceVnd!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000) stock!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(50_000) packageWeightGram!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) packageLengthCm!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) packageWidthCm!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) packageHeightCm!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) discountPercent?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000_000) discountAmountVnd?: number | null;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}

export class ReorderMediaDto {
  @IsArray() @ArrayUnique() @ArrayMinSize(1) @IsString({ each: true }) mediaIds!: string[];
}
