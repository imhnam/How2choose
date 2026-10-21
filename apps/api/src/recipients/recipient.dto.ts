import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class RecipientAddressDto {
  @IsIn(['legacy', 'current']) version!: 'legacy' | 'current';
  @IsInt() @Min(1) provinceCode!: number;
  @IsOptional() @IsInt() @Min(1) districtCode?: number;
  @IsInt() @Min(1) wardCode!: number;
  @IsString() @MinLength(3) @MaxLength(200) @Matches(/\S/) addressLine!: string;
}

export class CreateRecipientDto {
  @IsString() @MinLength(1) @MaxLength(100) displayName!: string;
  @IsOptional() @IsString() @Matches(/^(?:0\d{9}|\+84\d{9})$/) phone?: string | null;
  @IsOptional() @IsString() @MaxLength(100) relationship?: string;
  @IsOptional() @IsDateString({ strict: true, strictSeparator: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) birthday?: string | null;
  @IsArray() @ArrayMaxSize(30) @IsString({each:true}) interests!: string[];
  @IsArray() @ArrayMaxSize(30) @IsString({each:true}) dislikes!: string[];
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @ValidateNested() @Type(() => RecipientAddressDto) address?: RecipientAddressDto | null;
}
export class UpdateRecipientDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) displayName?: string;
  @IsOptional() @IsString() @Matches(/^(?:0\d{9}|\+84\d{9})$/) phone?: string | null;
  @IsOptional() @IsString() @MaxLength(100) relationship?: string;
  @IsOptional() @IsDateString({ strict: true, strictSeparator: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) birthday?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({each:true}) interests?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({each:true}) dislikes?: string[];
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @ValidateNested() @Type(() => RecipientAddressDto) address?: RecipientAddressDto | null;
}
