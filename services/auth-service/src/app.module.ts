import { Module } from '@nestjs/common';
import { SupabaseModule } from './supabase/supabase.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), SupabaseModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
