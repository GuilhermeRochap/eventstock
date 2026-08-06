import { IsEmail, MinLength, IsString, IsOptional } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(2)
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  senha!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  nomeCompany?: string;
}
