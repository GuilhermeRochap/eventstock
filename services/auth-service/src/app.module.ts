import { Module } from '@nestjs/common';
import { SupabaseModule } from './supabase/supabase.module';
import { ConfigModule } from '@nestjs/config';
import { CompaniesModule } from './companies/companies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    CompaniesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
