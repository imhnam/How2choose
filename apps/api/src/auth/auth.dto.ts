import { IsString, MaxLength, MinLength } from 'class-validator';
export class CredentialsDto {
  @IsString() @MinLength(3) @MaxLength(254) identifier!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
}

export class RegisterDto extends CredentialsDto {
  @IsString() @MinLength(2) @MaxLength(80) displayName!: string;
}

export class UpdateProfileDto {
  @IsString() @MinLength(2) @MaxLength(80) displayName!: string;
}
