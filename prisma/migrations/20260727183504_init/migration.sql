-- CreateEnum
CREATE TYPE "ColaboradorStatus" AS ENUM ('ATIVO', 'REMOVIDO');

-- CreateEnum
CREATE TYPE "TipoDocumentoStatus" AS ENUM ('ATIVO', 'REMOVIDO');

-- CreateEnum
CREATE TYPE "VinculoStatus" AS ENUM ('ATIVO', 'DESVINCULADO');

-- CreateEnum
CREATE TYPE "DocumentoStatus" AS ENUM ('ATIVO', 'REMOVIDO');

-- CreateTable
CREATE TABLE "colaboradores" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "ColaboradorStatus" NOT NULL DEFAULT 'ATIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_documento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "TipoDocumentoStatus" NOT NULL DEFAULT 'ATIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colaborador_has_documents" (
    "id" SERIAL NOT NULL,
    "colaborador_id" INTEGER NOT NULL,
    "tipo_documento_id" INTEGER NOT NULL,
    "status" "VinculoStatus" NOT NULL DEFAULT 'ATIVO',
    "versao_atual_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colaborador_has_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" SERIAL NOT NULL,
    "vinculo_id" INTEGER NOT NULL,
    "numero_versao" INTEGER NOT NULL,
    "status" "DocumentoStatus" NOT NULL DEFAULT 'ATIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "colaboradores_email_key" ON "colaboradores"("email");

-- CreateIndex
CREATE INDEX "colaboradores_status_idx" ON "colaboradores"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_documento_nome_key" ON "tipos_documento"("nome");

-- CreateIndex
CREATE INDEX "tipos_documento_status_idx" ON "tipos_documento"("status");

-- CreateIndex
CREATE UNIQUE INDEX "colaborador_has_documents_versao_atual_id_key" ON "colaborador_has_documents"("versao_atual_id");

-- CreateIndex
CREATE INDEX "colaborador_has_documents_status_idx" ON "colaborador_has_documents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "colaborador_has_documents_colaborador_id_tipo_documento_id_key" ON "colaborador_has_documents"("colaborador_id", "tipo_documento_id");

-- CreateIndex
CREATE INDEX "documentos_status_idx" ON "documentos"("status");

-- CreateIndex
CREATE INDEX "documentos_created_at_idx" ON "documentos"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_vinculo_id_numero_versao_key" ON "documentos"("vinculo_id", "numero_versao");

-- AddForeignKey
ALTER TABLE "colaborador_has_documents" ADD CONSTRAINT "colaborador_has_documents_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colaborador_has_documents" ADD CONSTRAINT "colaborador_has_documents_tipo_documento_id_fkey" FOREIGN KEY ("tipo_documento_id") REFERENCES "tipos_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colaborador_has_documents" ADD CONSTRAINT "colaborador_has_documents_versao_atual_id_fkey" FOREIGN KEY ("versao_atual_id") REFERENCES "documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_vinculo_id_fkey" FOREIGN KEY ("vinculo_id") REFERENCES "colaborador_has_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
