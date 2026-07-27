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

### `users`

| Campo        | Tipo     | Observações                    |
| ------------ | -------- | ------------------------------ |
| `id`         | Int      | Chave primária (autoincremento)|
| `nome`       | String   |                                |
| `sobrenome`  | String   |                                |
| `email`      | String   | Único                          |
| `created_at` | DateTime | Preenchido automaticamente     |
