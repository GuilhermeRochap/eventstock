import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly supabase: SupabaseService) {}
  //  criar eventos, tiers, etc
  async create(
    requestingUserId: string,
    requestingUserRole: string,
    requestingUserCompanyId: string | null,
    dto: CreateEventDto,
  ) {
    if (!requestingUserCompanyId) {
      throw new ForbiddenException('Usuário sem organização associada');
    }

    // Passo A: definir o organizer_id real
    let organizerId = requestingUserId;

    if (requestingUserRole === 'admin' && dto.organizerId) {
      // admin pode atribuir a outro organizador — validar que pertence à mesma company
      const { data: targetUser } = await this.supabase.client
        .from('users')
        .select('id, role, company_id')
        .eq('id', dto.organizerId)
        .maybeSingle();

      if (
        !targetUser ||
        targetUser.company_id !== requestingUserCompanyId ||
        !['admin', 'manager'].includes(targetUser.role)
      ) {
        throw new ForbiddenException(
          'organizerId inválido ou de outra company',
        );
      }

      organizerId = dto.organizerId;
    }

    // Passo B: validar soma dos tiers
    const somaTiers = dto.tiers.reduce(
      (soma, t) => soma + t.quantidadeMaxima,
      0,
    );

    if (somaTiers > dto.totalVagas) {
      throw new BadRequestException(
        'Soma das vagas dos tiers não pode ultrapassar o total de vagas do evento',
      );
    }

    const vagasPendentes = dto.totalVagas - somaTiers;

    // Passo C: criar o evento
    const { data: event, error: eventError } = await this.supabase.client
      .from('events')
      .insert({
        titulo: dto.titulo,
        descricao: dto.descricao,
        data_evento: dto.dataEvento,
        local: dto.local,
        organizer_id: organizerId,
        company_id: requestingUserCompanyId,
        total_vagas: dto.totalVagas,
        vagas_disponiveis: dto.totalVagas,
        vagas_pendentes_decisao: vagasPendentes,
        aguardando_definicao_cortesia: vagasPendentes > 0,
        status: 'rascunho',
      })
      .select()
      .single();

    if (eventError) {
      throw new Error(`Erro ao criar evento: ${eventError.message}`);
    }

    // Passo D: criar os tiers
    const tiersToInsert = dto.tiers.map((t) => ({
      event_id: event.id,
      nome: t.nome,
      quantidade_maxima: t.quantidadeMaxima,
      preco: t.preco,
      ordem: t.ordem,
    }));

    const { data: tiers, error: tiersError } = await this.supabase.client
      .from('price_tiers')
      .insert(tiersToInsert)
      .select();

    if (tiersError) {
      // rollback: remove o evento se os tiers falharem
      await this.supabase.client.from('events').delete().eq('id', event.id);
      throw new Error(`Erro ao criar tiers: ${tiersError.message}`);
    }

    return { event, tiers };
  }
  //   upload de imagem
  async uploadPhoto(
    eventId: string,
    requestingUserId: string,
    requestingUserRole: string,
    requestingUserCompanyId: string | null,
    file: Express.Multer.File,
  ) {
    const { data: event } = await this.supabase.client
      .from('events')
      .select('id, organizer_id, company_id')
      .eq('id', eventId)
      .maybeSingle();

    if (!event) {
      throw new BadRequestException('Evento não encontrado');
    }

    const isOwner = event.organizer_id === requestingUserId;
    const isCompanyAdmin =
      requestingUserRole === 'admin' &&
      event.company_id === requestingUserCompanyId;

    if (!isOwner && !isCompanyAdmin) {
      throw new ForbiddenException('Sem permissão para editar este evento');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não permitido');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('Arquivo excede o limite de 5MB');
    }

    const fileExt = file.originalname.split('.').pop();
    const filePath = `${eventId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('event-photos')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }

    const { data: publicUrlData } = this.supabase.client.storage
      .from('event-photos')
      .getPublicUrl(filePath);

    const { data: updatedEvent, error: updateError } =
      await this.supabase.client
        .from('events')
        .update({ foto_url: publicUrlData.publicUrl })
        .eq('id', eventId)
        .select()
        .single();

    if (updateError) {
      throw new Error(`Erro ao salvar URL da foto: ${updateError.message}`);
    }

    return updatedEvent;
  }
}
