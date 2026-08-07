import { IsString, MinLength } from 'class-validator';

export class BecomeOrganizerDto {
  @IsString()
  @MinLength(2)
  nomeCompany!: string;
}
