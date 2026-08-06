import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    // Passo A: buscar o usuário pelo e-mail
    const { data: user } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('email', dto.email)
      .maybeSingle();

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    // Passo B: comparar a senha enviada com o hash salvo
    const senhaValida = await bcrypt.compare(dto.senha, user.senha_hash);

    if (!senhaValida) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    // Passo C: montar o payload do token (o que vai dentro do JWT)
    const payload = {
      sub: user.id,
      role: user.role,
      company_id: user.company_id,
    };

    // Passo D: gerar o access token (curto, ex: 15min)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    // Passo E: gerar o refresh token (longo, ex: 7 dias)
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}
