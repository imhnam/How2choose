import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateRecipientDto {
  @IsString() @MinLength(1) @MaxLength(100) displayName!: string;
  @IsOptional() @IsString() @MaxLength(100) relationship?: string;
  @IsArray() @ArrayMaxSize(30) @IsString({each:true}) interests!: string[];
  @IsArray() @ArrayMaxSize(30) @IsString({each:true}) dislikes!: string[];
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
export class UpdateRecipientDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) displayName?: string;
  @IsOptional() @IsString() @MaxLength(100) relationship?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({each:true}) interests?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({each:true}) dislikes?: string[];
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
