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
npm run start:dev
```

## Scripts úteis

| Comando                  | Descrição                          |
| ------------------------ | ---------------------------------- |
| `npm run start:dev`      | API em modo watch                  |
| `npm run build`          | Compila para `dist/`               |
| `npm test`               | Testes unitários (Jest)            |
| `npm run test:cov`       | Testes com cobertura               |
| `npm run prisma:migrate` | Cria/aplica migrations (dev)       |
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
