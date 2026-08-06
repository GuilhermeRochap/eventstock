import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MinLength(2)
  nomeCompany!: string;

  @IsString()
  @MinLength(2)
  nomeAdmin!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  senha!: string;
}
