import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly supabase: SupabaseService) {}

  async createCompanyWithAdmin(dto: CreateCompanyDto) {
    const { data: existingUser } = await this.supabase.client
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const { data: company, error: companyError } = await this.supabase.client
      .from('companies')
      .insert({ nome: dto.nomeCompany })
      .select()
      .single();

    if (companyError) {
      throw new Error(`Erro ao criar organização: ${companyError.message}`);
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const { data: admin, error: adminError } = await this.supabase.client
      .from('users')
      .insert({
        nome: dto.nomeAdmin,
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
    return { company, admin: adminSemSenha };
  }
}
