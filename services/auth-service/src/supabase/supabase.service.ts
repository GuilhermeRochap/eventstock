import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { Database } from './database.types';

@Injectable()
export class SupabaseService {
  public readonly client: ReturnType<typeof createClient<Database>>;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis do Supabase não configuradas');
    }

    this.client = createClient<Database>(supabaseUrl, supabaseKey);
  }
}
