import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { obterAdaptadorOtp } from '../adapters/otp.adapter.js';
import { User, VerificacaoOtp } from '../models/index.js';
import { normalizarTelefone, validarApelido, validarNome, validarPalavraPasse } from '../validacoes/utilizador.validacao.js';

const finalidade = 'CRIAR_CONTA';

export class ServicoOtp {
  async solicitarCriacaoConta({ nome, apelido, telefone, palavraPasse, canal = 'WHATSAPP' }) {
    const dados = {
      nome: validarNome(nome),
      apelido: validarApelido(apelido),
      telefone: normalizarTelefone(telefone),
      canal: String(canal).toUpperCase()
    };
    validarPalavraPasse(palavraPasse);
    if (!['WHATSAPP', 'SMS'].includes(dados.canal)) throw erroValidacao('Selecione WhatsApp ou SMS para receber o código.');
    if (await User.findOne({ where: { telefone: dados.telefone } })) throw erroConflito('Este número de telefone já está registado.');

    const esperaSegundos = Number(process.env.OTP_REENVIO_SEGUNDOS) || 60;
    const recente = await VerificacaoOtp.findOne({
      where: { telefone: dados.telefone, finalidade, criado_em: { [Op.gt]: new Date(Date.now() - esperaSegundos * 1000) } },
      order: [['id', 'DESC']]
    });
    if (recente) {
      const erro = new Error(`Aguarde ${esperaSegundos} segundos antes de pedir outro código.`);
      erro.statusCode = 429;
      throw erro;
    }

    const codigo = String(randomInt(100000, 1000000));
    const validadeMinutos = Number(process.env.OTP_VALIDADE_MINUTOS) || 10;
    const [codigoHash, palavraPasseHash] = await Promise.all([bcrypt.hash(codigo, 10), bcrypt.hash(palavraPasse, 12)]);
    await VerificacaoOtp.update({ consumidoEm: new Date() }, { where: { telefone: dados.telefone, finalidade, consumidoEm: null } });
    const verificacao = await VerificacaoOtp.create({
      ...dados, finalidade, codigoHash, palavraPasseHash,
      expiraEm: new Date(Date.now() + validadeMinutos * 60 * 1000)
    });

    try {
      await obterAdaptadorOtp().enviar({ telefone: dados.telefone, codigo, canal: dados.canal, verificacaoId: verificacao.id, expiraEm: verificacao.expiraEm });
    } catch (erro) {
      await verificacao.update({ consumidoEm: new Date() });
      throw erro;
    }

    return {
      telefone: dados.telefone,
      canal: dados.canal,
      expiraEm: verificacao.expiraEm,
      ...((process.env.OTP_FORNECEDOR || 'SIMULADO') === 'SIMULADO'
        && process.env.NODE_ENV !== 'production'
        && process.env.OTP_EXIBIR_CODIGO !== 'false'
        && { codigoDemonstracao: codigo })
    };
  }

  async confirmarCriacaoConta({ telefone, codigo }) {
    const telefoneNormalizado = normalizarTelefone(telefone);
    if (!/^\d{6}$/.test(String(codigo || ''))) throw erroValidacao('O código deve conter 6 dígitos.');
    const verificacao = await VerificacaoOtp.findOne({
      where: { telefone: telefoneNormalizado, finalidade, consumidoEm: null, expiraEm: { [Op.gt]: new Date() } },
      order: [['id', 'DESC']]
    });
    if (!verificacao) throw erroValidacao('O código expirou ou já foi utilizado. Solicite um novo código.');
    if (verificacao.tentativas >= 5) throw erroConflito('O limite de tentativas foi atingido. Solicite um novo código.');

    const valido = await bcrypt.compare(String(codigo), verificacao.codigoHash);
    if (!valido) {
      await verificacao.increment('tentativas');
      throw erroValidacao('Código de confirmação incorreto.');
    }
    if (await User.findOne({ where: { telefone: telefoneNormalizado } })) throw erroConflito('Este número de telefone já está registado.');

    const utilizador = await User.create({
      nome: verificacao.nome,
      apelido: verificacao.apelido,
      telefone: verificacao.telefone,
      palavraPasseHash: verificacao.palavraPasseHash,
      perfil: 'PASSAGEIRO'
    });
    await verificacao.update({ consumidoEm: new Date() });
    return utilizador;
  }
}

function erroValidacao(mensagem) { const erro = new Error(mensagem); erro.statusCode = 400; return erro; }
function erroConflito(mensagem) { const erro = new Error(mensagem); erro.statusCode = 409; return erro; }
