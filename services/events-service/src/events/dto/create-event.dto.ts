import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class PriceTierDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsInt()
  @Min(1)
  quantidadeMaxima!: number;

  @IsInt()
  @Min(0)
  preco!: number;

  @IsInt()
  @Min(1)
  ordem!: number;
}

export class CreateEventDto {
  @IsString()
  titulo!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsDateString()
  dataEvento!: string;

  @IsOptional()
  @IsString()
  local?: string;

  @IsInt()
  @Min(1)
  totalVagas!: number;

  @IsOptional()
  @IsUUID()
  organizerId?: string; // só admin usa isso, pra criar em nome de manager/si mesmo

  @ValidateNested({ each: true })
  @Type(() => PriceTierDto)
  @ArrayMinSize(1)
  tiers!: PriceTierDto[];
}
