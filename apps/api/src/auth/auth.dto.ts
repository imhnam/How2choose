import { IsString, MaxLength, MinLength } from 'class-validator';
export class CredentialsDto {
  @IsString() @MinLength(3) @MaxLength(254) identifier!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
}
