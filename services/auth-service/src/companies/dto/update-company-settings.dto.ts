import { IsBoolean } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsBoolean()
  requerAprovacaoEmail!: boolean;
}
