import bcrypt from 'bcryptjs';
import { Assento, Auditoria, Bilhete, Bus, Empresa, Notificacao, Pagamento, Reserva, Route, Trip, User } from '../../models/index.js';
import { gerarMapaAssentos } from '../../services/assento.service.js';

export async function executar({ transaction }) {
  if (process.env.CRIAR_DADOS_DEMO !== 'true') return;
  const empresa = await Empresa.findOne({ where: { slug: 'viagem-bus' }, transaction });

  const [passageiro] = await User.findOrCreate({
    where: { telefone: '+258840000002' },
    defaults: { nome: 'Passageiro', apelido: 'de Testes', telefone: '+258840000002', palavraPasseHash: await bcrypt.hash('Passageiro@123', 12), perfil: 'PASSAGEIRO', activo: true },
    transaction
  });
  const [autocarro] = await Bus.findOrCreate({ where: { registration: 'TST-01-26' }, defaults: { empresaId: empresa.id, model: 'Yutong Interprovincial', capacity: 32, active: true }, transaction });
  const [rota] = await Route.findOrCreate({ where: { empresaId: empresa.id, origin: 'Tete', destination: 'Maputo' }, defaults: { originProvince: 'Tete', destinationProvince: 'Maputo Cidade', distanceKm: 1500, active: true }, transaction });

  await Assento.bulkCreate(gerarMapaAssentos(autocarro.capacity).map((assento) => ({ ...assento, autocarroId: autocarro.id })), { ignoreDuplicates: true, transaction });
  const assentos = await Assento.findAll({ where: { autocarroId: autocarro.id }, order: [['id', 'ASC']], transaction });
  const partida = new Date();
  partida.setDate(partida.getDate() + 20);
  partida.setHours(8, 0, 0, 0);
  const chegada = new Date(partida);
  chegada.setHours(chegada.getHours() + 18);
  const [viagem] = await Trip.findOrCreate({ where: { routeId: rota.id, busId: autocarro.id, departureAt: partida }, defaults: { empresaId: empresa.id, arrivalExpectedAt: chegada, price: 1500, status: 'AGENDADA' }, transaction });

  const [bilhete] = await Bilhete.findOrCreate({
    where: { codigo: 'BIL-DEMO-001' },
    defaults: { utilizadorId: passageiro.id, viagemId: viagem.id, assentoId: assentos[0].id, nomePassageiro: `${passageiro.nome} ${passageiro.apelido}`, preco: viagem.price, estado: 'EMITIDO' },
    transaction
  });
  await Pagamento.findOrCreate({ where: { referencia: 'PAG-DEMO-001' }, defaults: { bilheteId: bilhete.id, metodo: 'MPESA', valor: viagem.price, estado: 'APROVADO' }, transaction });
  await Reserva.findOrCreate({ where: { utilizadorId: passageiro.id, viagemId: viagem.id, assentoId: assentos[1].id }, defaults: { estado: 'PENDENTE', expiraEm: new Date(Date.now() + 15 * 60 * 1000) }, transaction });
  await Notificacao.findOrCreate({ where: { utilizadorId: passageiro.id, titulo: 'Bilhete emitido' }, defaults: { mensagem: 'O seu bilhete de demonstração foi emitido com sucesso.', tipo: 'BILHETE' }, transaction });
  await Auditoria.findOrCreate({ where: { operacao: 'CRIAR_DEMONSTRACAO', entidade: 'sistema', entidadeId: 'BIL-DEMO-001' }, defaults: { valoresNovos: { viagemId: viagem.id, bilheteId: bilhete.id }, enderecoIp: '127.0.0.1' }, transaction });
}
