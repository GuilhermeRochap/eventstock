import { IsEmail, IsString, MinLength, IsIn } from 'class-validator';

export class CreateUserByAdminDto {
  @IsString()
  @MinLength(2)
  nome!: string;

  @IsEmail()
  email!: string;

  @IsIn(['admin', 'manager'])
  role!: 'admin' | 'manager';
}
