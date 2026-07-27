import {
  ColaboradorStatus,
  DocumentoStatus,
  PrismaClient,
  TipoDocumentoStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Cria N versões de um documento para um vínculo e aponta o vínculo para a
 * última — reproduz o comportamento do endpoint de envio/reenvio.
 */
async function enviar(vinculoId: number, versoes: number): Promise<void> {
  let ultimaId = 0;
  for (let numeroVersao = 1; numeroVersao <= versoes; numeroVersao++) {
    const doc = await prisma.documento.create({
      data: { vinculoId, numeroVersao },
    });
    ultimaId = doc.id;
  }
  await prisma.colaboradorHasDocuments.update({
    where: { id: vinculoId },
    data: { versaoAtualId: ultimaId },
  });
}

async function vincular(
  colaboradorId: number,
  tipoDocumentoId: number,
): Promise<number> {
  const vinculo = await prisma.colaboradorHasDocuments.create({
    data: { colaboradorId, tipoDocumentoId },
  });
  return vinculo.id;
}

async function main(): Promise<void> {
  console.log('Limpando dados existentes...');
  await prisma.documento.deleteMany();
  await prisma.colaboradorHasDocuments.deleteMany();
  await prisma.tipoDocumento.deleteMany();
  await prisma.colaborador.deleteMany();

  console.log('Criando tipos de documento...');
  const cpf = await prisma.tipoDocumento.create({ data: { nome: 'CPF' } });
  const rg = await prisma.tipoDocumento.create({ data: { nome: 'RG' } });
  const aso = await prisma.tipoDocumento.create({ data: { nome: 'ASO' } });
  const certidao = await prisma.tipoDocumento.create({
    data: { nome: 'Certidão de Nascimento' },
  });
  const compResidencia = await prisma.tipoDocumento.create({
    data: { nome: 'Comprovante de Residência' },
  });
  // Tipo removido (soft delete): não deve aparecer em estatísticas/pendentes.
  await prisma.tipoDocumento.create({
    data: { nome: 'Documento Legado', status: TipoDocumentoStatus.REMOVIDO },
  });

  console.log('Criando colaboradores...');
  const ana = await prisma.colaborador.create({
    data: { nome: 'Ana', sobrenome: 'Silva', email: 'ana.silva@example.com' },
  });
  const beto = await prisma.colaborador.create({
    data: { nome: 'Beto', sobrenome: 'Souza', email: 'beto.souza@example.com' },
  });
  const carla = await prisma.colaborador.create({
    data: { nome: 'Carla', sobrenome: 'Dias', email: 'carla.dias@example.com' },
  });
  const daniel = await prisma.colaborador.create({
    data: {
      nome: 'Daniel',
      sobrenome: 'Rocha',
      email: 'daniel.rocha@example.com',
    },
  });
  const elena = await prisma.colaborador.create({
    data: {
      nome: 'Elena',
      sobrenome: 'Costa',
      email: 'elena.costa@example.com',
    },
  });
  // Colaborador removido (soft delete): não deve aparecer em estatísticas/pendentes.
  await prisma.colaborador.create({
    data: {
      nome: 'Fábio',
      sobrenome: 'Lima',
      email: 'fabio.lima@example.com',
      status: ColaboradorStatus.REMOVIDO,
    },
  });

  console.log('Criando vínculos e envios...');

  // Ana: CPF (2 versões), RG (1 versão), ASO (pendente)
  await enviar(await vincular(ana.id, cpf.id), 2);
  await enviar(await vincular(ana.id, rg.id), 1);
  await vincular(ana.id, aso.id);

  // Beto: CPF (pendente), Comprovante (1 versão)
  await vincular(beto.id, cpf.id);
  await enviar(await vincular(beto.id, compResidencia.id), 1);

  // Carla: CPF (1 versão), ASO (1 versão), Certidão (pendente)
  await enviar(await vincular(carla.id, cpf.id), 1);
  await enviar(await vincular(carla.id, aso.id), 1);
  await vincular(carla.id, certidao.id);

  // Daniel: CPF (pendente), RG (pendente)
  await vincular(daniel.id, cpf.id);
  await vincular(daniel.id, rg.id);

  // Elena: CPF (3 versões), ASO (pendente), Certidão (1 versão)
  await enviar(await vincular(elena.id, cpf.id), 3);
  await vincular(elena.id, aso.id);
  await enviar(await vincular(elena.id, certidao.id), 1);

  // Caso de documento com versão removida (soft delete) + rollback:
  // Elena reenvia o Comprovante (v1 e v2), mas a v2 é removida e o ponteiro
  // volta para a v1. O histórico preserva ambas.
  const vinculoElenaComp = await vincular(elena.id, compResidencia.id);
  const v1 = await prisma.documento.create({
    data: { vinculoId: vinculoElenaComp, numeroVersao: 1 },
  });
  const v2 = await prisma.documento.create({
    data: { vinculoId: vinculoElenaComp, numeroVersao: 2 },
  });
  await prisma.documento.update({
    where: { id: v2.id },
    data: { status: DocumentoStatus.REMOVIDO },
  });
  await prisma.colaboradorHasDocuments.update({
    where: { id: vinculoElenaComp },
    data: { versaoAtualId: v1.id },
  });

  console.log('Seed concluído com sucesso.');
}

main()
  .catch((error) => {
    console.error('Erro ao executar o seed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
