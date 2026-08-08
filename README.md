# EventStock - Plataforma de Gestão e Venda de Ingressos

## 0) Objetivo

### Escopo

Construir uma plataforma multi-tenant de gestão de eventos e venda de ingressos, como projeto acadêmico e de portfólio técnico, sem fins comerciais, que:

- Permite que **companies** (empresas/equipes) cadastrem organizadores (`admin`, `manager`) que criam e gerenciam eventos com lotes de preço escalonados (price tiers);
- Suporta **vagas cortesia**, distribuídas por convite ou atribuição direta, nunca expostas na listagem pública;
- Processa **compra de ingressos** com checkout, expiração automática, waitlist (fila de espera) e wishlist (lista de desejos);
- Gera **notificações automáticas** (e-mail) sobre proximidade do evento, esgotamento, cancelamento e atualizações do organizador;
- Fornece **relatórios de faturamento** por evento e agregados por company, com distinção entre receita real e ingressos cortesia;
- Suporta múltiplas formas de autenticação: cadastro direto, criação por admin (senha temporária), OAuth Google, e promoção de comprador para organizador (`become-organizer`).

### Fora do escopo

- Pagamento real (produção usa apenas sandbox de gateways, AbacatePay/Mercado Pago, nunca cobrança de fato);
- Multi-idioma, multi-moeda;
- Aplicativo mobile nativo (a interface é web).

---

## 1) Arquitetura e stack

### Arquitetura de microsserviços

```
/eventstock
  /services
    /auth-service          autenticação, roles, multi-tenant
    /events-service         eventos, price tiers, cortesia, faturamento
    /ticketing-service       compra, waitlist, wishlist, pagamento (planejado)
    /notification-service    e-mails, jobs agendados, aprovação (planejado)
  /frontend
  /docs
  docker-compose.yml
```

Comunicação entre serviços: **REST síncrono** (validação de token, consultas diretas) e **fila de eventos assíncrona** (Redis/Asynq, planejado para Ticketing e Notification).

### Stack por camada

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + NestJS |
| Banco de dados | PostgreSQL via Supabase (schema compartilhado entre serviços) |
| Armazenamento de arquivos | Supabase Storage (bucket público `event-photos`) |
| Cache / Rate limiting | Upstash Redis (HTTP-based, compatível com serverless) |
| Autenticação | JWT (access + refresh token com rotation), Passport.js |
| OAuth | Google OAuth 2.0 |
| Validação | class-validator / class-transformer |
| Deploy alvo | Vercel (Fluid Compute, zero-config para NestJS) |
| Containerização (dev) | Docker Compose |

### Timezone e moeda

- Timezone de referência: `America/Sao_Paulo`;
- Valores monetários: `numeric(10,2)` no Postgres, nunca `float`;
- Moeda única: BRL.

### Segredos

Variáveis sensíveis apenas em `.env` (nunca commitadas):
```
SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET / JWT_REFRESH_SECRET
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL
```

---

## 2) Modelo de dados (implementado até o momento)

### Auth Service

```
companies
  id, nome, configuracoes (jsonb, inclui requer_aprovacao_email), criado_em

users
  id, nome, email, senha_hash (nullable, null quando login via Google),
  role (enum: admin | manager | user),
  company_id (FK, nullable, null apenas para role=user),
  senha_temporaria (boolean),
  criado_por, criado_em

refresh_tokens
  id, user_id (FK), token_hash (sha256), expira_em, revogado, criado_em
```

### Events Service

```
events
  id, titulo, descricao, foto_url,
  data_evento, local,
  organizer_id (FK para users, admin ou manager),
  company_id (FK para companies),
  total_vagas, vagas_disponiveis,
  vagas_pendentes_decisao, aguardando_definicao_cortesia,
  status (enum: rascunho | publicado | lotado | encerrado | cancelado),
  criado_em, atualizado_em

price_tiers
  id, event_id (FK), nome, quantidade_maxima, preco, ordem,
  is_cortesia (boolean, nunca exposto publicamente)
```

**Princípio de temporalidade de preço:** o preço de um tier é imutável assim que ele registra a primeira venda. Isso permite adicionar novos tiers ou editar tiers ainda não atingidos, sem retroatividade sobre compradores anteriores.

---

## 3) Regras de negócio (detalhadas)

### 3.1 Multi-tenancy e autenticação

- Todo `admin`/`manager` pertence a exatamente uma `company`; `user` (comprador) nunca pertence a company nenhuma;
- **Isolamento por company** obrigatório em toda rota sensível: um admin nunca acessa ou edita recursos de outra company (testado via `RolesGuard` combinado com checagem de `company_id` no service);
- **Quatro fluxos de entrada**:
  1. Signup público, gera `user` comum, ou `admin` mais company nova (se `nomeCompany` informado);
  2. Admin cria usuário (`admin`/`manager`) com senha temporária, força troca no primeiro login;
  3. OAuth Google, cria ou associa `user` automaticamente (sem senha local);
  4. `become-organizer`, `user` existente promove a própria conta a `admin` de uma company nova, preservando histórico (mesmo `id`).
- Refresh token com **rotation**: uso único, revogado a cada troca; reuso de token já usado é bloqueado.
- Rate limiting de login: 5 tentativas por e-mail a cada 15 min (Upstash Redis).

### 3.2 Eventos e price tiers

- Evento pertence a um `organizer_id` (admin ou manager) e a uma `company_id`;
- Admin pode criar evento em nome de si mesmo ou de um manager da própria company;
- Soma de `quantidade_maxima` dos tiers **não pode ultrapassar** `total_vagas`;
- Se a soma for **menor**, a diferença vira `vagas_pendentes_decisao`. O evento fica com `aguardando_definicao_cortesia = true` e **não pode ser publicado** até o organizador resolver (novo tier pago ou cortesia oculta);
- Tiers `is_cortesia = true` nunca aparecem em endpoints públicos; distribuição via convite por link ou atribuição direta por `user_id`.

### 3.3 Faturamento

- Relatório por evento: soma de tickets pagos, excluindo tiers cortesia; cortesia aparece separada (quantidade, sem valor);
- Relatório agregado por company: soma de todos os eventos de todos os organizadores, com breakdown por organizador e por evento.

### 3.4 Cancelamento

- Cancelamento de evento marca todos os tickets pagos como `reembolsado` (simulado) e dispara notificação (compradores recebem aviso de reembolso; waitlist recebe aviso sem menção a reembolso).

---

## 4) API implementada até o momento

### Auth Service (porta 3000)

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| POST | `/auth/signup` | pública | Cadastro (comprador ou organizador) |
| POST | `/auth/login` | pública | Login (email/senha) |
| POST | `/auth/refresh` | pública* | Renovação de tokens (rotation) |
| POST | `/auth/logout` | pública* | Revogação de refresh token |
| GET | `/auth/google` | pública | Início do fluxo OAuth |
| GET | `/auth/google/callback` | pública | Callback OAuth |
| GET | `/auth/me` | JWT | Dados do usuário autenticado |
| POST | `/auth/become-organizer` | JWT | Promove `user` a `admin` de company nova |
| POST | `/auth/change-password` | JWT | Troca de senha (obrigatória se temporária) |
| POST | `/auth/users` | JWT + role admin | Admin cria manager/admin com senha temporária |
| PATCH | `/companies/:id/settings` | JWT + role admin | Toggle de aprovação de e-mail |

*protegidas por posse do refresh token válido, não por access token

### Events Service (porta 3001)

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| POST | `/events` | JWT + role admin/manager | Cria evento com price tiers |
| POST | `/events/:id/photo` | JWT + role admin/manager | Upload de foto (Supabase Storage) |

*(demais rotas do backlog, publicação, edição, listagem, relatórios, cortesia, em desenvolvimento)*

---

## 5) Segurança

- Senhas com `bcrypt` (cost factor 10); refresh tokens com hash SHA-256 (nunca texto puro em banco);
- `role` e `company_id` **nunca** aceitos diretamente do payload do cliente, sempre derivados do JWT ou fixados no backend;
- Mensagens de erro de autenticação genéricas (evita user enumeration);
- RLS desativado nas tabelas, autorização centralizada na camada de aplicação (guards e checagem de `company_id`), decisão consciente já que não há acesso direto do frontend ao Supabase;
- CORS e headers de segurança a configurar na fase de deploy.

---

## 6) Plano de entrega (status atual)

- [x] **Fundação**: monorepo, Docker Compose esqueleto, CI básico, Supabase configurado
- [x] **Auth Service**: modelagem, signup unificado, login, middlewares de auth/autorização, refresh rotation, logout, rate limiting, become-organizer, toggle de aprovação, criação por admin, OAuth Google
- [ ] **Events Service**: modelagem e criação de evento com upload de foto concluídos; publicação, edição, listagem, cortesia e relatórios de faturamento em andamento
- [ ] **Ticketing Service**: não iniciado (checkout, waitlist, wishlist, pagamento sandbox)
- [ ] **Notification Service**: não iniciado (e-mails, jobs agendados, convite por link, fluxo de aprovação)

---

## 7) Como rodar localmente

```cmd
REM Auth Service
cd services/auth-service
npm install
npx nest build
node dist/main.js
REM roda na porta 3000

REM Events Service (outro terminal)
cd services/events-service
npm install
npx nest build
node dist/main.js
REM roda na porta 3001
```

Cada serviço requer seu próprio `.env` (ver `.env.example` em cada pasta). `JWT_SECRET` deve ser **idêntico** entre Auth Service e qualquer serviço que valide tokens (Events, Ticketing), já que a validação é descentralizada.

---

## 8) Decisões técnicas registradas

- **`module: commonjs`** no `tsconfig.json` de cada serviço Nest: `nodenext` causava falha silenciosa de build (arquivo `dist/main.js` não gerado apesar de "0 errors" reportado);
- **Upstash Redis (HTTP)** em vez de `ioredis` (TCP): compatibilidade com deploy serverless na Vercel;
- **Supabase Storage** para fotos de evento: reaproveita a mesma infraestrutura do banco, sem custo adicional, free tier suficiente para o escopo acadêmico;
- **RLS desativado**: autorização inteiramente na camada de aplicação, já que não há acesso direto do frontend ao banco.