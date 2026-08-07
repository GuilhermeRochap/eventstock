import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { hashToken } from './utils/token-rash.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  // SIGNUP
  async signup(dto: SignupDto) {
    const { data: existingUser } = await this.supabase.client
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    if (dto.nomeCompany) {
      const { data: company, error: companyError } = await this.supabase.client
        .from('companies')
        .insert({ nome: dto.nomeCompany })
        .select()
        .single();

      if (companyError) {
        throw new Error(`Erro ao criar company: ${companyError.message}`);
      }

      const { data: admin, error: adminError } = await this.supabase.client
        .from('users')
        .insert({
          nome: dto.nome,
          email: dto.email,
          senha_hash: senhaHash,
          role: 'admin',
          company_id: company.id,
        })
        .select()
        .single();

      if (adminError) {
        await this.supabase.client
          .from('companies')
          .delete()
          .eq('id', company.id);
        throw new Error(`Erro ao criar admin: ${adminError.message}`);
      }

      const { senha_hash, ...adminSemSenha } = admin;
      return { company, user: adminSemSenha };
    }

    const { data: user, error } = await this.supabase.client
      .from('users')
      .insert({
        nome: dto.nome,
        email: dto.email,
        senha_hash: senhaHash,
        role: 'user',
        company_id: null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar usuário: ${error.message}`);
    }

    const { senha_hash, ...userSemSenha } = user;
    return { user: userSemSenha };
  }
  // LOGIN
  async login(dto: LoginDto) {
    const { data: user } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('email', dto.email)
      .maybeSingle();

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const senhaValida = await bcrypt.compare(dto.senha, user.senha_hash);

    if (!senhaValida) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    return this.generateTokenPair(user.id, user.role, user.company_id);
  }
  // LOGOUT
  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    const { data: storedToken } = await this.supabase.client
      .from('refresh_tokens')
      .select('id')
      .eq('token_hash', tokenHash)
      .eq('revogado', false)
      .maybeSingle();

    if (!storedToken) {
      // o resultado final desejado (usuário deslogado) já está garantido
      return { message: 'Sessão encerrada' };
    }

    await this.supabase.client
      .from('refresh_tokens')
      .update({ revogado: true })
      .eq('id', storedToken.id);

    return { message: 'Sessão encerrada' };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; role: string; company_id: string | null };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const tokenHash = hashToken(refreshToken);

    const { data: storedToken } = await this.supabase.client
      .from('refresh_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('user_id', payload.sub)
      .eq('revogado', false)
      .maybeSingle();

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token inválido ou já utilizado');
    }

    await this.supabase.client
      .from('refresh_tokens')
      .update({ revogado: true })
      .eq('id', storedToken.id);

    return this.generateTokenPair(
      payload.sub,
      payload.role,
      payload.company_id,
    );
  }

  private async generateTokenPair(
    userId: string,
    role: string,
    companyId: string | null,
  ) {
    const payload = { sub: userId, role, company_id: companyId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 7);

    await this.supabase.client.from('refresh_tokens').insert({
      user_id: userId,
      token_hash: hashToken(refreshToken),
      expira_em: expiraEm.toISOString(),
    });

    return { accessToken, refreshToken };
  }
}
