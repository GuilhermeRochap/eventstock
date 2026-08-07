import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService {
  public readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      url: this.configService.get<string>('UPSTASH_REDIS_REST_URL')!,
      token: this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN')!,
    });
  }
}
