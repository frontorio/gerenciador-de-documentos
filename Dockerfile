# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências (aproveita cache de camadas)
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Copia o restante do código e compila
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- Stage 2: produção ----------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Apenas dependências de produção
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# Artefatos compilados
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
