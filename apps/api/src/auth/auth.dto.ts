import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
export class CredentialsDto {
  @IsString() @MinLength(3) @MaxLength(254) identifier!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
}

export class RegisterDto extends CredentialsDto {
  @IsString() @MinLength(2) @MaxLength(80) displayName!: string;
}

export class UpdateProfileDto {
  @IsString() @MinLength(2) @MaxLength(80) displayName!: string;
  @IsOptional() @IsDateString({ strict: true, strictSeparator: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) birthday?: string | null;
}

export class SaveAccountAddressDto {
  @IsString() @MinLength(2) @MaxLength(100) @Matches(/\S/) recipientName!: string;
  @IsString() @Matches(/^(?:0\d{9}|\+84\d{9})$/) phone!: string;
  @IsIn(['legacy', 'current']) version!: 'legacy' | 'current';
  @IsInt() @Min(1) provinceCode!: number;
  @IsOptional() @IsInt() @Min(1) districtCode?: number;
  @IsInt() @Min(1) wardCode!: number;
  @IsString() @MinLength(3) @MaxLength(200) @Matches(/\S/) addressLine!: string;
}
