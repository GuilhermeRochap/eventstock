# EventStock

Plataforma de gestão e venda de ingressos para eventos, desenvolvida como projeto acadêmico e de portfólio técnico, sem fins comerciais.

## Sobre o projeto

O EventStock permite que empresas (companies) cadastrem seus próprios organizadores de eventos — managers e admins — que criam eventos com lotes de preço escalonados (ex: ingresso antecipado mais barato, subindo de preço conforme as vagas se esgotam), gerenciam vagas cortesia, acompanham faturamento em tempo real e se comunicam com o público através de posts e notificações automáticas.

Do lado do comprador, o usuário navega por eventos publicados, compra ingressos, entra em lista de espera quando um evento lota, adiciona eventos à lista de desejos e recebe notificações sobre o andamento da compra e a proximidade do evento.

### Por que esse projeto existe

O EventStock foi concebido como um ambiente de prática para arquitetura de microsserviços do mundo real não como um produto a ser vendido. O objetivo é aplicar, numa única base de código, conceitos que normalmente aparecem espalhados em projetos menores: autenticação segura e multi-tenant, filas de eventos assíncronas, jobs agendados, integração com gateways de pagamento (em sandbox), e um fluxo de aprovação organizacional completo.

## Arquitetura

O sistema é dividido em quatro microsserviços independentes, comunicando-se via REST (síncrono) e uma fila de eventos (assíncrono):

- **Auth Service** — autenticação, roles e isolamento multi-tenant por company
- **Events Service** — cadastro de eventos, lotes de preço, cortesias e faturamento
- **Ticketing Service** — compra, waitlist, wishlist e integração de pagamento
- **Notification Service** — e-mails transacionais, jobs agendados e fluxo de aprovação

O banco de dados é gerenciado pelo Supabase (Postgres), com schemas separados por serviço.

## Tecnologias

- Backend: Nest.js
- Frontend: Angular / React (a definir)
- Banco de dados: PostgreSQL via Supabase
- Fila de eventos: Redis + Asynq
- Pagamentos: gateway mock (dev) + sandbox AbacatePay / Mercado Pago
- Containerização: Docker + Docker Compose
- CI: GitHub Actions

## Estrutura de pastas

```
/eventstock
  /services
    /auth-service
    /events-service
    /ticketing-service
    /notification-service
  /frontend
  /docs
  docker-compose.yml
  README.md
```

## Como rodar localmente

> Em construção — instruções completas virão conforme os serviços forem implementados.

1. Clonar o repositório
2. Copiar `.env.example` para `.env` e preencher com as credenciais do Supabase
3. Rodar `docker compose up`

## Variáveis de ambiente

Ver `.env.example` na raiz do projeto para a lista completa (nunca commitar o `.env` com valores reais).

## Status do projeto

Em desenvolvimento — fase de planejamento e definição de backlog concluída para Auth, Events e Ticketing Service.

## Contribuindo

Projeto pessoal/acadêmico. Fluxo de trabalho: toda mudança passa por branch + Pull Request, mesmo em desenvolvimento solo, seguindo o padrão `Backlog (Linear) → branch → PR → CI → merge`.
