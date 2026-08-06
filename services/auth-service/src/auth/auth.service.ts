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

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  async signup(dto: SignupDto) {
    // Passo A: checar e-mail duplicado
    const { data: existingUser } = await this.supabase.client
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    // Caminho A: virar organizador direto no cadastro
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

    // Caminho B: comprador comum
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
  //  LOGIN
  async login(dto: LoginDto) {
    // Passo A.1: buscar o usuário pelo e-mail
    const { data: user } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('email', dto.email)
      .maybeSingle();

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    // Passo B.1: comparar a senha enviada com o hash salvo
    const senhaValida = await bcrypt.compare(dto.senha, user.senha_hash);

    if (!senhaValida) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    // Passo C.1: montar o payload do token (o que vai dentro do JWT)
    const payload = {
      sub: user.id,
      role: user.role,
      company_id: user.company_id,
    };

    // Passo D.1: gerar o access token (curto, ex: 15min)
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
