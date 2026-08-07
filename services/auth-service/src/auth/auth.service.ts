import {
  ConflictException,
  HttpException,
  HttpStatus,
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
import { RedisService } from '../redis/redis.service';
import { BecomeOrganizerDto } from './dto/become-organizer.dto';
import { generateTempPassword } from './utils/generate-temp-password.utils';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  // Rate limit
  private async checkRateLimit(email: string): Promise<void> {
    const key = `login_attempts:${email}`;
    const attempts = await this.redis.client.incr(key);

    if (attempts === 1) {
      await this.redis.client.expire(key, 15 * 60);
    }

    if (attempts > 5) {
      throw new HttpException(
        'Muitas tentativas de login. Tente novamente em alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async resetRateLimit(email: string): Promise<void> {
    await this.redis.client.del(`login_attempts:${email}`);
  }

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

  // CREATE USER BY ADMIN
  async createUserByAdmin(
    requestingAdminCompanyId: string | null,
    dto: CreateUserByAdminDto,
  ) {
    if (!requestingAdminCompanyId) {
      throw new ConflictException('Admin sem company associada');
    }

    const { data: existingUser } = await this.supabase.client
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const tempPassword = generateTempPassword();
    const senhaHash = await bcrypt.hash(tempPassword, 10);

    const { data: newUser, error } = await this.supabase.client
      .from('users')
      .insert({
        nome: dto.nome,
        email: dto.email,
        senha_hash: senhaHash,
        role: dto.role,
        company_id: requestingAdminCompanyId,
        senha_temporaria: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar usuário: ${error.message}`);
    }

    const { senha_hash, ...userSemSenha } = newUser;

    // Retornamos a senha temporária em TEXTO PURO só nessa resposta única —
    // é a ÚNICA vez que ela existe em texto puro fora do processo de hash
    return { user: userSemSenha, senhaTemporaria: tempPassword };
  }

  // USER VIRA ADMIN (BECOME ORGANIZER)
  async becomeOrganizer(userId: string, dto: BecomeOrganizerDto) {
    const { data: currentUser } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!currentUser) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (currentUser.role !== 'user') {
      throw new ConflictException('Usuário já possui papel organizacional');
    }

    const { data: company, error: companyError } = await this.supabase.client
      .from('companies')
      .insert({ nome: dto.nomeCompany })
      .select()
      .single();

    if (companyError) {
      throw new Error(`Erro ao criar company: ${companyError.message}`);
    }

    const { data: updatedUser, error: updateError } = await this.supabase.client
      .from('users')
      .update({ role: 'admin', company_id: company.id })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      await this.supabase.client
        .from('companies')
        .delete()
        .eq('id', company.id);
      throw new Error(`Erro ao promover usuário: ${updateError.message}`);
    }

    const tokens = await this.generateTokenPair(
      updatedUser.id,
      updatedUser.role,
      updatedUser.company_id,
    );

    return { company, ...tokens };
  }

  // CHANGE PASSWORD
  async changePassword(userId: string, novaSenha: string) {
    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

    await this.supabase.client
      .from('users')
      .update({ senha_hash: novaSenhaHash, senha_temporaria: false })
      .eq('id', userId);

    return { message: 'Senha alterada com sucesso' };
  }

  // LOGIN
  async login(dto: LoginDto) {
    await this.checkRateLimit(dto.email);

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

    await this.resetRateLimit(dto.email);

    const tokens = await this.generateTokenPair(
      user.id,
      user.role,
      user.company_id,
    );

    return { ...tokens, senhaTemporaria: user.senha_temporaria };
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
      return { message: 'Sessão encerrada' };
    }

    await this.supabase.client
      .from('refresh_tokens')
      .update({ revogado: true })
      .eq('id', storedToken.id);

    return { message: 'Sessão encerrada' };
  }

  // REFRESH
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
