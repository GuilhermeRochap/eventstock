import { Controller, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';

@Controller('companies')
export class CompaniesSettingsController {
  constructor(private readonly companiesService: CompaniesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/settings')
  async updateSettings(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateCompanySettingsDto,
  ) {
    return this.companiesService.updateSettings(id, req.user.companyId, dto);
  }
}
