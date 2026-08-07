import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { CompaniesSettingsController } from './companies-settings.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [CompaniesController, CompaniesSettingsController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
