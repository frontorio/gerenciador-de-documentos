# Gerenciador de Documentos — API

API RESTful (JSON) para gerenciamento de documentos.

## Stack

- Node.js + TypeScript
- NestJS
- PostgreSQL + Prisma ORM
- Jest (testes unitários)
- Docker / Docker Compose

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose

## Configuração

```bash
cp .env.example .env   # ajuste as variáveis se necessário
npm install
```

## Executando com Docker (recomendado)

Sobe o banco PostgreSQL e a API já com as migrations aplicadas:

```bash
docker compose up --build
```

API disponível em `http://localhost:3000`.

Documentação interativa (Swagger UI): `http://localhost:3000/docs`
Spec OpenAPI (JSON): `http://localhost:3000/docs-json`

## Executando localmente (sem Docker para a API)

Suba apenas o banco via Docker e rode a API na máquina:

```bash
docker compose up -d db
npx prisma migrate dev      # cria/aplica as migrations
npm run prisma:seed         # (opcional) popula a massa de testes
npm run start:dev
```

## Massa de testes (seed)

Para popular o banco com dados realistas de exemplo (colaboradores, tipos,
vínculos, envios com versões e casos de soft delete):

```bash
npm run prisma:seed
```

O seed limpa os dados existentes e recria uma base com 5 colaboradores ativos
(+1 removido), 5 tipos ativos (+1 removido), vínculos variados, documentos com
múltiplas versões e um caso de versão removida com rollback. Útil para exercitar
estatísticas, pendências e histórico.

Para testar os endpoints manualmente, use o arquivo [`requests.http`](./requests.http)
com a extensão **REST Client** (VS Code) ou o **HTTP Client** do JetBrains.

## Scripts úteis

| Comando                  | Descrição                          |
| ------------------------ | ---------------------------------- |
| `npm run start:dev`      | API em modo watch                  |
| `npm run build`          | Compila para `dist/`               |
| `npm test`               | Testes unitários (Jest)            |
| `npm run test:cov`       | Testes com cobertura               |
| `npm run prisma:migrate` | Cria/aplica migrations (dev)       |
| `npm run prisma:seed`    | Popula a massa de testes           |
| `npm run prisma:studio`  | Abre o Prisma Studio               |

## Modelo de dados

```
colaboradores ─┐
               ├─< colaborador_has_documents >─ tipos_documento
               │             │
               │             └──(versao_atual)──> documentos (versões)
```

### `colaboradores`

| Campo        | Tipo     | Observações                        |
| ------------ | -------- | ---------------------------------- |
| `id`         | Int      | Chave primária (autoincremento)    |
| `nome`       | String   |                                    |
| `sobrenome`  | String   |                                    |
| `email`      | String   | Único                              |
| `status`     | Enum     | `ATIVO` / `REMOVIDO` (soft delete) |
| `created_at` | DateTime | Preenchido automaticamente         |
| `updated_at` | DateTime | Atualizado automaticamente         |

### `tipos_documento`

| Campo        | Tipo     | Observações                        |
| ------------ | -------- | ---------------------------------- |
| `id`         | Int      | Chave primária (autoincremento)    |
| `nome`       | String   | Único (ex.: CPF, ASO, Certidão)    |
| `status`     | Enum     | `ATIVO` / `REMOVIDO` (soft delete) |
| `created_at` | DateTime |                                    |
| `updated_at` | DateTime |                                    |

### `colaborador_has_documents` (vínculo / requisito, N:N)

Vincula um colaborador a um tipo de documento obrigatório. É a origem do
estado **pendente/enviado**: pendente quando `versao_atual_id` é `NULL`.

| Campo             | Tipo | Observações                                        |
| ----------------- | ---- | -------------------------------------------------- |
| `id`              | Int  | Chave primária                                     |
| `colaborador_id`  | Int  | FK → `colaboradores`                               |
| `tipo_documento_id` | Int | FK → `tipos_documento`                            |
| `status`          | Enum | `ATIVO` / `DESVINCULADO` (desvinculação lógica)    |
| `versao_atual_id` | Int? | FK → `documentos`; `NULL` = pendente               |
| `created_at`      | DateTime |                                                |
| `updated_at`      | DateTime |                                                |

Restrição única `(colaborador_id, tipo_documento_id)`.

### `documentos` (envios / versões)

Cada envio é uma versão imutável. O reenvio cria uma nova versão e atualiza
o ponteiro `versao_atual_id` do vínculo, dentro de uma transação — as versões
anteriores são preservadas.

| Campo          | Tipo | Observações                              |
| -------------- | ---- | ---------------------------------------- |
| `id`           | Int  | Chave primária                           |
| `vinculo_id`   | Int  | FK → `colaborador_has_documents`         |
| `numero_versao`| Int  | Sequencial por vínculo                    |
| `status`       | Enum | `ATIVO` / `REMOVIDO` (soft delete)       |
| `created_at`   | DateTime |                                      |

Restrição única `(vinculo_id, numero_versao)`.

## Endpoints

Documentação interativa completa em `http://localhost:3000/docs` (Swagger).
Todas as listagens são paginadas via `?page` (default `1`) e `?limit` (default `10`).

### Colaboradores

| Método   | Rota                 | Descrição                              |
| -------- | -------------------- | -------------------------------------- |
| `POST`   | `/colaboradores`     | Cadastra um colaborador                |
| `GET`    | `/colaboradores`     | Lista colaboradores ativos (paginado)  |
| `GET`    | `/colaboradores/:id` | Busca um colaborador por id            |
| `PATCH`  | `/colaboradores/:id` | Atualiza um colaborador                |
| `DELETE` | `/colaboradores/:id` | Remove (soft delete) um colaborador    |

Body de criação:

```json
{ "nome": "Ana", "sobrenome": "Silva", "email": "ana.silva@example.com" }
```

### Tipos de documento

| Método   | Rota                   | Descrição                            |
| -------- | ---------------------- | ------------------------------------ |
| `POST`   | `/tipos-documento`     | Cadastra um tipo (`nome` único)      |
| `GET`    | `/tipos-documento`     | Lista tipos ativos (paginado)        |
| `GET`    | `/tipos-documento/:id` | Busca um tipo por id                 |
| `PATCH`  | `/tipos-documento/:id` | Atualiza um tipo                     |
| `DELETE` | `/tipos-documento/:id` | Remove (soft delete) um tipo         |

Body de criação:

```json
{ "nome": "CPF" }
```

### Vínculos (colaborador ↔ tipo de documento)

| Método   | Rota                                                     | Descrição                                             |
| -------- | -------------------------------------------------------- | ----------------------------------------------------- |
| `POST`   | `/colaboradores/:colaboradorId/vinculos`                 | Vincula a um tipo; reativa se estava desvinculado     |
| `GET`    | `/colaboradores/:colaboradorId/vinculos`                 | Lista vínculos ativos com estado `PENDENTE`/`ENVIADO` |
| `DELETE` | `/colaboradores/:colaboradorId/vinculos/:tipoDocumentoId`| Desvincula (soft delete do vínculo)                   |

Body de vinculação:

```json
{ "tipoDocumentoId": 1 }
```

### Documentos (envio / versionamento)

| Método   | Rota                                                                | Descrição                                            |
| -------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `POST`   | `/colaboradores/:colaboradorId/documentos`                          | Envia/reenvia (cria nova versão, atômico)            |
| `GET`    | `/colaboradores/:colaboradorId/documentos/:tipoDocumentoId/historico`| Histórico de versões (paginado)                     |
| `DELETE` | `/colaboradores/:colaboradorId/documentos/:tipoDocumentoId`         | Remove a versão atual (soft delete + rollback)       |
| `GET`    | `/documentos/pendentes`                                             | Lista requisitos pendentes (filtros + paginação)     |

Body de envio:

```json
{ "tipoDocumentoId": 1 }
```

Filtros de pendentes: `?colaboradorId=` e `?tipoDocumentoId=` (opcionais).

### Estatísticas

| Método | Rota                                  | Descrição                                  |
| ------ | ------------------------------------- | ------------------------------------------ |
| `GET`  | `/estatisticas`                       | Dashboard com as três métricas             |
| `GET`  | `/estatisticas/completude`            | Percentual global de documentação completa |
| `GET`  | `/estatisticas/tipos-mais-pendentes`  | Ranking dos tipos mais pendentes           |
| `GET`  | `/estatisticas/ultimos-envios`        | Últimos envios realizados                  |

Parâmetro `?limit=` (default `5`, máx. `50`) nos rankings/listas.
