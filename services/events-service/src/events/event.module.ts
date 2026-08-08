import { Module } from '@nestjs/common';
import { EventsController } from './event.controller';
import { EventsService } from './event.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [SupabaseModule, PassportModule],
  controllers: [EventsController],
  providers: [EventsService, JwtStrategy],
})
export class EventsModule {}
