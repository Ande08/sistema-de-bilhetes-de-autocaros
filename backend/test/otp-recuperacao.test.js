import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { sequelize } from '../src/config/database.js';
import { User, VerificacaoOtp } from '../src/models/index.js';
import { ServicoOtp } from '../src/services/otp.service.js';

test('não revela se o telefone de recuperação está registado', async (contexto) => {
  const originais = guardarMetodos();
  contexto.after(() => restaurarMetodos(originais));
  VerificacaoOtp.findOne = async () => null;
  VerificacaoOtp.update = async () => [0];
  VerificacaoOtp.create = async (dados) => ({ id: 10, ...dados, update: async () => {} });
  User.findOne = async () => null;

  const resultado = await new ServicoOtp().solicitarRecuperacaoPalavraPasse({
    telefone: '841234567', canal: 'WHATSAPP'
  });

  assert.equal(resultado.telefone, '+258841234567');
  assert.match(resultado.mensagem, /Se o número estiver registado/);
  assert.equal(resultado.codigoDemonstracao, undefined);
});

test('redefine a palavra-passe depois de confirmar um OTP válido', async (contexto) => {
  const originais = guardarMetodos();
  contexto.after(() => restaurarMetodos(originais));
  const codigoHash = await bcrypt.hash('123456', 4);
  let novaHash = '';
  const verificacao = { codigoHash, tentativas: 0, increment: async () => {}, update: async () => {} };
  VerificacaoOtp.findOne = async () => verificacao;
  VerificacaoOtp.update = async () => [1];
  User.findOne = async () => ({ update: async ({ palavraPasseHash }) => { novaHash = palavraPasseHash; } });
  sequelize.transaction = async (executar) => executar({});

  const resultado = await new ServicoOtp().confirmarRecuperacaoPalavraPasse({
    telefone: '+258841234567', codigo: '123456', novaPalavraPasse: 'NovaSenha@123'
  });

  assert.match(resultado.mensagem, /redefinida com sucesso/);
  assert.equal(await bcrypt.compare('NovaSenha@123', novaHash), true);
});

function guardarMetodos() {
  return {
    verificacaoFindOne: VerificacaoOtp.findOne,
    verificacaoUpdate: VerificacaoOtp.update,
    verificacaoCreate: VerificacaoOtp.create,
    userFindOne: User.findOne,
    transaction: sequelize.transaction
  };
}

function restaurarMetodos(originais) {
  VerificacaoOtp.findOne = originais.verificacaoFindOne;
  VerificacaoOtp.update = originais.verificacaoUpdate;
  VerificacaoOtp.create = originais.verificacaoCreate;
  User.findOne = originais.userFindOne;
  sequelize.transaction = originais.transaction;
}
