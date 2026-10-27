import '../src/config/carregar-ambiente.js';
import bcrypt from 'bcryptjs';
import { sequelize } from '../src/config/database.js';
import { Empresa, User } from '../src/models/index.js';

const URL_API = process.env.URL_API_TESTE || 'http://localhost:3000/api';
const ADMIN_TESTE = {
  telefone: '+258840000099',
  palavraPasse: 'AdminIntegracao2026!'
};

function garantir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

async function requisicao(caminho, { token, estadoEsperado, ...opcoes } = {}) {
  const resposta = await fetch(`${URL_API}${caminho}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...opcoes.headers
    },
    ...opcoes
  });
  const corpo = await resposta.json();
  if (estadoEsperado !== undefined) {
    garantir(resposta.status === estadoEsperado, `${opcoes.method || 'GET'} ${caminho}: esperado ${estadoEsperado}, recebido ${resposta.status}. ${corpo.mensagem || ''}`);
    return corpo;
  }
  if (!resposta.ok) throw new Error(`${opcoes.method || 'GET'} ${caminho}: ${resposta.status} - ${corpo.mensagem || 'erro sem mensagem'}`);
  return corpo.dados;
}

function corpo(dados) {
  return JSON.stringify(dados);
}

async function prepararAdministradorTeste(sufixo) {
  const palavraPasseHash = await bcrypt.hash(ADMIN_TESTE.palavraPasse, 12);
  const [empresa] = await Empresa.findOrCreate({
    where: { slug: `empresa-integracao-${sufixo}` },
    defaults: { nome: `Empresa Integração ${sufixo}`, activa: true }
  });
  const [administrador, criado] = await User.findOrCreate({
    where: { telefone: ADMIN_TESTE.telefone },
    defaults: {
      nome: 'Administrador', apelido: 'Integração', palavraPasseHash,
      perfil: 'ADMIN', empresaId: empresa.id, activo: true
    }
  });
  if (!criado) {
    await administrador.update({ palavraPasseHash, perfil: 'ADMIN', empresaId: empresa.id, activo: true });
  }
}

async function executar() {
  garantir(process.env.NODE_ENV !== 'production', 'O teste de integração não pode ser executado em produção.');
  const sufixo = String(Date.now()).slice(-7);
  const telefonePassageiro = `+25885${sufixo}`;
  const palavraPassePassageiro = 'TestePassageiro2026!';
  const partida = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const chegada = new Date(partida.getTime() + 8 * 60 * 60 * 1000);
  const dataPesquisa = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(partida);
  const origem = 'Maputo';
  const destino = 'Beira';

  await requisicao('/health');
  const respostaCors = await fetch(`${URL_API}/autenticacao/iniciar-sessao`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://127.0.0.1:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type'
    }
  });
  garantir(respostaCors.status === 204, 'O pedido CORS de desenvolvimento não foi aceite.');
  garantir(respostaCors.headers.get('access-control-allow-origin') === 'http://127.0.0.1:5173', 'O backend não autorizou o frontend aberto por 127.0.0.1.');
  console.log('1. API disponível e CORS local autorizado');

  await prepararAdministradorTeste(sufixo);

  const sessaoAdmin = await requisicao('/autenticacao/iniciar-sessao', {
    method: 'POST',
    body: corpo({ telefone: ADMIN_TESTE.telefone, palavraPasse: ADMIN_TESTE.palavraPasse })
  });
  garantir(sessaoAdmin.utilizador.perfil === 'ADMIN', 'A conta configurada não possui perfil administrativo.');
  console.log('2. Autenticação administrativa aprovada');

  await requisicao('/gestao/autocarros', {
    token: sessaoAdmin.token,
    method: 'POST',
    estadoEsperado: 400,
    body: corpo({ matricula: `INV-${sufixo}`, modelo: 'Inválido', capacidade: 0 })
  });
  const autocarro = await requisicao('/gestao/autocarros', {
    token: sessaoAdmin.token,
    method: 'POST',
    body: corpo({ matricula: `TST-${sufixo}`, modelo: 'Autocarro de Integração', capacidade: 12 })
  });
  console.log('3. Validação e registo de autocarro aprovados');

  await requisicao('/gestao/rotas', {
    token: sessaoAdmin.token,
    method: 'POST',
    estadoEsperado: 400,
    body: corpo({ origemProvincia: 'Maputo Cidade', origem, destinoProvincia: 'Maputo Cidade', destino: origem, distanciaKm: 10 })
  });
  const rota = await requisicao('/gestao/rotas', {
    token: sessaoAdmin.token,
    method: 'POST',
    body: corpo({ origemProvincia: 'Maputo Cidade', origem, destinoProvincia: 'Sofala', destino, distanciaKm: 1190 })
  });
  console.log('4. Validação e registo de rota aprovados');

  const viagem = await requisicao('/gestao/viagens', {
    token: sessaoAdmin.token,
    method: 'POST',
    body: corpo({ rotaId: rota.id, autocarroId: autocarro.id, partidaEm: partida.toISOString(), chegadaPrevistaEm: chegada.toISOString(), preco: 1250 })
  });
  console.log('5. Registo administrativo de viagem aprovado');

  const pedidoOtp = await requisicao('/autenticacao/solicitar-registo', {
    method: 'POST',
    body: corpo({ nome: 'Passageiro', apelido: `Teste ${sufixo}`, telefone: telefonePassageiro, palavraPasse: palavraPassePassageiro, canal: 'WHATSAPP' })
  });
  garantir(/^\d{6}$/.test(pedidoOtp.codigoDemonstracao), 'O OTP de demonstração não foi devolvido.');
  await requisicao('/autenticacao/confirmar-registo', {
    method: 'POST',
    estadoEsperado: 400,
    body: corpo({ telefone: telefonePassageiro, codigo: '000000' })
  });
  await requisicao('/autenticacao/confirmar-registo', {
    method: 'POST',
    body: corpo({ telefone: telefonePassageiro, codigo: pedidoOtp.codigoDemonstracao })
  });
  await requisicao('/autenticacao/solicitar-registo', {
    method: 'POST',
    estadoEsperado: 409,
    body: corpo({ nome: 'Duplicado', apelido: 'Teste', telefone: telefonePassageiro, palavraPasse: palavraPassePassageiro, canal: 'WHATSAPP' })
  });
  console.log('6. Cadastro, OTP incorreto, OTP correto e duplicação validados');

  await requisicao('/autenticacao/iniciar-sessao', {
    method: 'POST',
    estadoEsperado: 401,
    body: corpo({ telefone: telefonePassageiro, palavraPasse: 'palavra-passe-incorreta' })
  });
  const sessaoPassageiro = await requisicao('/autenticacao/iniciar-sessao', {
    method: 'POST',
    body: corpo({ telefone: telefonePassageiro, palavraPasse: palavraPassePassageiro })
  });
  console.log('7. Login inválido e login válido verificados');

  await requisicao('/gestao/painel', { token: sessaoPassageiro.token, estadoEsperado: 403 });
  const viagens = await requisicao(`/viagens?${new URLSearchParams({ origem, destino, data: dataPesquisa })}`);
  garantir(viagens.some((item) => String(item.id) === String(viagem.id)), 'A viagem criada não apareceu na pesquisa.');
  const assentos = await requisicao(`/viagens/${viagem.id}/assentos`);
  const assento = assentos.find((item) => item.disponivel);
  garantir(assento, 'Nenhum assento disponível foi encontrado.');
  console.log('8. Permissões, pesquisa de viagem e assentos verificados');

  await requisicao('/pagamentos-simulados', {
    token: sessaoPassageiro.token,
    method: 'POST',
    estadoEsperado: 400,
    body: corpo({ viagemId: viagem.id, metodo: 'CARTAO', dadosPagamento: { numeroCartao: '1234', validade: '12/30', cvv: '123' } })
  });
  const pagamentoPendente = await requisicao('/pagamentos-simulados', {
    token: sessaoPassageiro.token,
    method: 'POST',
    body: corpo({ viagemId: viagem.id, metodo: 'MPESA', dadosPagamento: { telefone: telefonePassageiro } })
  });
  garantir(pagamentoPendente.estado === 'PENDENTE', 'O pagamento não iniciou como pendente.');
  const pagamentoAprovado = await requisicao(`/pagamentos-simulados/${encodeURIComponent(pagamentoPendente.referencia)}/processar`, {
    token: sessaoPassageiro.token,
    method: 'POST'
  });
  garantir(pagamentoAprovado.estado === 'APROVADO', 'O pagamento simulado não foi aprovado.');
  console.log('9. Validação, processamento e aprovação do pagamento verificados');

  const compra = await requisicao('/compras', {
    token: sessaoPassageiro.token,
    method: 'POST',
    body: corpo({ viagemId: viagem.id, assentoId: assento.id, metodoPagamento: 'MPESA', referenciaPagamento: pagamentoAprovado.referencia })
  });
  garantir(compra.bilhete.codigo && compra.bilhete.estado === 'EMITIDO', 'O bilhete não foi emitido corretamente.');
  await requisicao('/compras', {
    token: sessaoPassageiro.token,
    method: 'POST',
    estadoEsperado: 409,
    body: corpo({ viagemId: viagem.id, assentoId: assento.id, metodoPagamento: 'MPESA', referenciaPagamento: pagamentoAprovado.referencia })
  });
  console.log('10. Compra, emissão e bloqueio de referência reutilizada verificados');

  const bilhete = await requisicao(`/compras/bilhete/${encodeURIComponent(compra.bilhete.codigo)}`, { token: sessaoPassageiro.token });
  const resumo = await requisicao('/conta/resumo', { token: sessaoPassageiro.token });
  garantir(String(bilhete.utilizadorId) === String(sessaoPassageiro.utilizador.id), 'O bilhete pertence a outro utilizador.');
  garantir(resumo.bilhetes.some((item) => item.codigo === compra.bilhete.codigo), 'O bilhete não apareceu na conta do passageiro.');

  const painel = await requisicao('/gestao/painel', { token: sessaoAdmin.token });
  garantir(painel.autocarros.some((item) => String(item.id) === String(autocarro.id)), 'O autocarro não apareceu no painel administrativo.');
  garantir(painel.rotas.some((item) => String(item.id) === String(rota.id)), 'A rota não apareceu no painel administrativo.');
  garantir(painel.bilhetes.some((item) => item.codigo === compra.bilhete.codigo), 'O bilhete não apareceu no painel administrativo.');
  console.log('11. Conta do passageiro e painel administrativo verificados');

  const avisoManual = await requisicao(`/gestao/viagens/${viagem.id}/avisos-whatsapp`, {
    token: sessaoAdmin.token,
    method: 'POST',
    body: corpo({ mensagem: 'Aviso de teste: apresente-se no terminal com trinta minutos de antecedência.' })
  });
  garantir(avisoManual.totalDestinatarios === 1, 'O aviso manual não foi preparado para o passageiro da viagem.');
  let estadoWhatsapp = await requisicao('/gestao/whatsapp/estado', { token: sessaoAdmin.token });
  garantir(estadoWhatsapp.fila.recentes.some((item) => item.tipo === 'AVISO_VIAGEM' && String(item.viagemId) === String(viagem.id)), 'O aviso manual não entrou na fila persistente.');
  console.log('12. Aviso manual aos passageiros colocado na fila persistente');

  const cancelamento = await requisicao(`/viagens/${viagem.id}/cancelar`, {
    token: sessaoAdmin.token,
    method: 'PATCH',
    body: corpo({ motivo: 'Cancelamento criado pelo teste automatizado de integração.' })
  });
  garantir(cancelamento.status === 'CANCELADA', 'A viagem não foi cancelada.');
  garantir(Number(cancelamento.avisosWhatsapp) === 1, 'O cancelamento não criou o aviso automático esperado.');
  estadoWhatsapp = await requisicao('/gestao/whatsapp/estado', { token: sessaoAdmin.token });
  const avisosDaViagem = estadoWhatsapp.fila.recentes.filter((item) => item.tipo === 'AVISO_VIAGEM' && String(item.viagemId) === String(viagem.id));
  garantir(avisosDaViagem.length === 2, 'A fila não contém exatamente o aviso manual e o aviso de cancelamento.');
  console.log('13. Cancelamento e aviso automático aos compradores verificados');

  console.log(JSON.stringify({
    sucesso: true,
    passageiro: telefonePassageiro,
    autocarroId: autocarro.id,
    rotaId: rota.id,
    viagemId: viagem.id,
    bilhete: compra.bilhete.codigo,
    pagamento: pagamentoAprovado.referencia,
    avisosWhatsapp: avisosDaViagem.length
  }, null, 2));
}

executar()
  .catch((erro) => {
    console.error(`TESTE DE INTEGRAÇÃO FALHOU: ${erro.message}`);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
