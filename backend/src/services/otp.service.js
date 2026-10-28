import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { obterAdaptadorOtp } from '../adapters/otp.adapter.js';
import { Empresa, User, VerificacaoOtp } from '../models/index.js';
import { normalizarTelefone, validarApelido, validarNome, validarPalavraPasse } from '../validacoes/utilizador.validacao.js';

const FINALIDADE_CRIAR_CONTA = 'CRIAR_CONTA';
const FINALIDADE_RECUPERAR = 'RECUPERAR_PALAVRA_PASSE';
const FINALIDADE_ALTERAR = 'ALTERAR_PALAVRA_PASSE';

export class ServicoOtp {
  async solicitarCriacaoConta({ nome, apelido, telefone, palavraPasse, canal = 'WHATSAPP', tipoConta = 'PASSAGEIRO', empresaNome }) {
    const tipoNormalizado = String(tipoConta || 'PASSAGEIRO').toUpperCase();
    if (!['PASSAGEIRO', 'EMPRESA'].includes(tipoNormalizado)) throw erroValidacao('Selecione um tipo de conta válido.');
    const nomeEmpresa = tipoNormalizado === 'EMPRESA' ? validarNomeEmpresa(empresaNome) : null;
    const dados = {
      nome: validarNome(nome),
      apelido: validarApelido(apelido),
      telefone: normalizarTelefone(telefone),
      canal: String(canal).toUpperCase(),
      tipoConta: tipoNormalizado,
      empresaNome: nomeEmpresa
    };
    validarPalavraPasse(palavraPasse);
    if (!['WHATSAPP', 'SMS'].includes(dados.canal)) throw erroValidacao('Selecione WhatsApp ou SMS para receber o código.');
    if (await User.findOne({ where: { telefone: dados.telefone } })) throw erroConflito('Este número de telefone já está registado.');
    if (nomeEmpresa && await Empresa.findOne({ where: { slug: criarSlug(nomeEmpresa), eliminadaEm: null } })) {
      throw erroConflito('Já existe uma empresa registada com este nome.');
    }

    const esperaSegundos = Number(process.env.OTP_REENVIO_SEGUNDOS) || 60;
    const recente = await VerificacaoOtp.findOne({
      where: { telefone: dados.telefone, finalidade: FINALIDADE_CRIAR_CONTA, criado_em: { [Op.gt]: new Date(Date.now() - esperaSegundos * 1000) } },
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
    await VerificacaoOtp.update({ consumidoEm: new Date() }, { where: { telefone: dados.telefone, finalidade: FINALIDADE_CRIAR_CONTA, consumidoEm: null } });
    const verificacao = await VerificacaoOtp.create({
      ...dados, finalidade: FINALIDADE_CRIAR_CONTA, codigoHash, palavraPasseHash,
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
      where: { telefone: telefoneNormalizado, finalidade: FINALIDADE_CRIAR_CONTA, consumidoEm: null, expiraEm: { [Op.gt]: new Date() } },
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

    return sequelize.transaction(async (transaction) => {
      let empresa = null;
      if (verificacao.tipoConta === 'EMPRESA') {
        const slug = criarSlug(validarNomeEmpresa(verificacao.empresaNome));
        if (await Empresa.findOne({ where: { slug, eliminadaEm: null }, transaction })) {
          throw erroConflito('Já existe uma empresa registada com este nome.');
        }
        empresa = await Empresa.create({
          nome: verificacao.empresaNome,
          slug,
          telefone: verificacao.telefone,
          activa: false,
          estadoCadastro: 'PENDENTE'
        }, { transaction });
      }
      const utilizador = await User.create({
        nome: verificacao.nome,
        apelido: verificacao.apelido,
        telefone: verificacao.telefone,
        palavraPasseHash: verificacao.palavraPasseHash,
        empresaId: empresa?.id || null,
        perfil: empresa ? 'EMPRESA_ADMIN' : 'PASSAGEIRO'
      }, { transaction });
      await verificacao.update({ consumidoEm: new Date() }, { transaction });
      if (empresa) utilizador.setDataValue('empresaPendente', empresa);
      return utilizador;
    });
  }

  async solicitarRecuperacaoPalavraPasse({ telefone, canal = 'WHATSAPP' }) {
    const telefoneNormalizado = normalizarTelefone(telefone);
    const canalNormalizado = String(canal).toUpperCase();
    if (!['WHATSAPP', 'SMS'].includes(canalNormalizado)) throw erroValidacao('Selecione WhatsApp ou SMS para receber o código.');

    const esperaSegundos = Number(process.env.OTP_REENVIO_SEGUNDOS) || 60;
    const recente = await VerificacaoOtp.findOne({
      where: {
        telefone: telefoneNormalizado,
        finalidade: FINALIDADE_RECUPERAR,
        criado_em: { [Op.gt]: new Date(Date.now() - esperaSegundos * 1000) }
      },
      order: [['id', 'DESC']]
    });
    if (recente) {
      const erro = new Error(`Aguarde ${esperaSegundos} segundos antes de pedir outro código.`);
      erro.statusCode = 429;
      throw erro;
    }

    const codigo = String(randomInt(100000, 1000000));
    const validadeMinutos = Number(process.env.OTP_VALIDADE_MINUTOS) || 10;
    const codigoHash = await bcrypt.hash(codigo, 10);
    const utilizador = await User.findOne({
      where: { telefone: telefoneNormalizado, activo: true, eliminadoEm: null }
    });

    // Também é criado um registo neutro para telefones inexistentes. Assim,
    // nem a resposta nem o limite de reenvio permitem descobrir contas válidas.
    await VerificacaoOtp.update({ consumidoEm: new Date() }, {
      where: { telefone: telefoneNormalizado, finalidade: FINALIDADE_RECUPERAR, consumidoEm: null }
    });
    const verificacao = await VerificacaoOtp.create({
      telefone: telefoneNormalizado,
      finalidade: FINALIDADE_RECUPERAR,
      canal: canalNormalizado,
      codigoHash,
      expiraEm: new Date(Date.now() + validadeMinutos * 60 * 1000)
    });

    if (utilizador) {
      try {
        await obterAdaptadorOtp().enviar({
          telefone: telefoneNormalizado, codigo, canal: canalNormalizado,
          verificacaoId: verificacao.id, expiraEm: verificacao.expiraEm
        });
      } catch (erro) {
        await verificacao.update({ consumidoEm: new Date() });
        throw erro;
      }
    }

    return {
      telefone: telefoneNormalizado,
      canal: canalNormalizado,
      expiraEm: verificacao.expiraEm,
      mensagem: 'Se o número estiver registado, receberá um código de recuperação.',
      ...(utilizador
        && (process.env.OTP_FORNECEDOR || 'SIMULADO') === 'SIMULADO'
        && process.env.NODE_ENV !== 'production'
        && process.env.OTP_EXIBIR_CODIGO !== 'false'
        && { codigoDemonstracao: codigo })
    };
  }

  async confirmarRecuperacaoPalavraPasse({ telefone, codigo, novaPalavraPasse }) {
    const telefoneNormalizado = normalizarTelefone(telefone);
    if (!/^\d{6}$/.test(String(codigo || ''))) throw erroValidacao('O código deve conter 6 dígitos.');
    validarPalavraPasse(novaPalavraPasse);

    const verificacao = await VerificacaoOtp.findOne({
      where: {
        telefone: telefoneNormalizado,
        finalidade: FINALIDADE_RECUPERAR,
        consumidoEm: null,
        expiraEm: { [Op.gt]: new Date() }
      },
      order: [['id', 'DESC']]
    });
    if (!verificacao || verificacao.tentativas >= 5) throw erroValidacao('Código inválido ou expirado. Solicite um novo código.');

    const valido = await bcrypt.compare(String(codigo), verificacao.codigoHash);
    if (!valido) {
      await verificacao.increment('tentativas');
      throw erroValidacao('Código inválido ou expirado. Solicite um novo código.');
    }
    const utilizador = await User.findOne({
      where: { telefone: telefoneNormalizado, activo: true, eliminadoEm: null }
    });
    if (!utilizador) {
      await verificacao.update({ consumidoEm: new Date() });
      throw erroValidacao('Código inválido ou expirado. Solicite um novo código.');
    }

    const palavraPasseHash = await bcrypt.hash(novaPalavraPasse, 12);
    await sequelize.transaction(async (transaction) => {
      await utilizador.update({ palavraPasseHash }, { transaction });
      await VerificacaoOtp.update({ consumidoEm: new Date() }, {
        where: { telefone: telefoneNormalizado, finalidade: FINALIDADE_RECUPERAR, consumidoEm: null },
        transaction
      });
    });
    return { mensagem: 'Palavra-passe redefinida com sucesso.' };
  }

  async solicitarAlteracaoPalavraPasse(utilizadorId) {
    const utilizador = await User.findOne({
      where: { id: utilizadorId, activo: true, eliminadoEm: null }
    });
    if (!utilizador) {
      const erro = new Error('Usuário não encontrado ou desativado.');
      erro.statusCode = 404;
      throw erro;
    }

    const esperaSegundos = Number(process.env.OTP_REENVIO_SEGUNDOS) || 60;
    const recente = await VerificacaoOtp.findOne({
      where: {
        telefone: utilizador.telefone,
        finalidade: FINALIDADE_ALTERAR,
        criado_em: { [Op.gt]: new Date(Date.now() - esperaSegundos * 1000) }
      },
      order: [['id', 'DESC']]
    });
    if (recente) {
      const erro = new Error(`Aguarde ${esperaSegundos} segundos antes de pedir outro código.`);
      erro.statusCode = 429;
      throw erro;
    }

    const codigo = String(randomInt(100000, 1000000));
    const validadeMinutos = Number(process.env.OTP_VALIDADE_MINUTOS) || 10;
    const codigoHash = await bcrypt.hash(codigo, 10);
    await VerificacaoOtp.update({ consumidoEm: new Date() }, {
      where: { telefone: utilizador.telefone, finalidade: FINALIDADE_ALTERAR, consumidoEm: null }
    });
    const verificacao = await VerificacaoOtp.create({
      telefone: utilizador.telefone,
      finalidade: FINALIDADE_ALTERAR,
      canal: 'WHATSAPP',
      codigoHash,
      expiraEm: new Date(Date.now() + validadeMinutos * 60 * 1000)
    });

    try {
      await obterAdaptadorOtp().enviar({
        telefone: utilizador.telefone,
        codigo,
        canal: 'WHATSAPP',
        verificacaoId: verificacao.id,
        expiraEm: verificacao.expiraEm
      });
    } catch (erro) {
      await verificacao.update({ consumidoEm: new Date() });
      throw erro;
    }

    return {
      telefone: mascararTelefone(utilizador.telefone),
      canal: 'WHATSAPP',
      expiraEm: verificacao.expiraEm,
      mensagem: 'Código de segurança enviado pelo WhatsApp.',
      ...((process.env.OTP_FORNECEDOR || 'SIMULADO') === 'SIMULADO'
        && process.env.NODE_ENV !== 'production'
        && process.env.OTP_EXIBIR_CODIGO !== 'false'
        && { codigoDemonstracao: codigo })
    };
  }

  async confirmarAlteracaoPalavraPasse(utilizadorId, { codigo, novaPalavraPasse }) {
    if (!/^\d{6}$/.test(String(codigo || ''))) throw erroValidacao('O código deve conter 6 dígitos.');
    validarPalavraPasse(novaPalavraPasse);

    const utilizador = await User.findOne({
      where: { id: utilizadorId, activo: true, eliminadoEm: null }
    });
    if (!utilizador) {
      const erro = new Error('Usuário não encontrado ou desativado.');
      erro.statusCode = 404;
      throw erro;
    }
    const verificacao = await VerificacaoOtp.findOne({
      where: {
        telefone: utilizador.telefone,
        finalidade: FINALIDADE_ALTERAR,
        consumidoEm: null,
        expiraEm: { [Op.gt]: new Date() }
      },
      order: [['id', 'DESC']]
    });
    if (!verificacao || verificacao.tentativas >= 5) {
      throw erroValidacao('Código inválido ou expirado. Solicite um novo código.');
    }

    const codigoValido = await bcrypt.compare(String(codigo), verificacao.codigoHash);
    if (!codigoValido) {
      await verificacao.increment('tentativas');
      throw erroValidacao('Código inválido ou expirado. Solicite um novo código.');
    }
    if (await bcrypt.compare(novaPalavraPasse, utilizador.palavraPasseHash)) {
      throw erroValidacao('A nova palavra-passe deve ser diferente da palavra-passe atual.');
    }

    const palavraPasseHash = await bcrypt.hash(novaPalavraPasse, 12);
    await sequelize.transaction(async (transaction) => {
      await utilizador.update({ palavraPasseHash }, { transaction });
      await VerificacaoOtp.update({ consumidoEm: new Date() }, {
        where: { telefone: utilizador.telefone, finalidade: FINALIDADE_ALTERAR, consumidoEm: null },
        transaction
      });
    });
    return { mensagem: 'Palavra-passe alterada com sucesso.' };
  }
}

function erroValidacao(mensagem) { const erro = new Error(mensagem); erro.statusCode = 400; return erro; }
function erroConflito(mensagem) { const erro = new Error(mensagem); erro.statusCode = 409; return erro; }
function validarNomeEmpresa(valor) {
  const nome = String(valor || '').trim().replace(/\s+/g, ' ');
  if (nome.length < 3 || nome.length > 160) throw erroValidacao('O nome da empresa deve ter entre 3 e 160 caracteres.');
  if (!/[\p{L}\d].*[\p{L}\d]/u.test(nome)) throw erroValidacao('Introduza um nome de empresa válido.');
  return nome;
}

function criarSlug(valor) {
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function mascararTelefone(telefone) {
  const valor = String(telefone || '');
  return valor.length > 4 ? `${valor.slice(0, 5)}***${valor.slice(-3)}` : valor;
}
