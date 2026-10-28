import { ServicoAutenticacao } from '../services/autenticacao.service.js';
import { ServicoOtp } from '../services/otp.service.js';

const servico = new ServicoAutenticacao();
const servicoOtp = new ServicoOtp();

export async function solicitarRegisto(req, res, next) {
  try {
    return res.json({ sucesso: true, dados: await servicoOtp.solicitarCriacaoConta(req.body) });
  } catch (erro) { return next(erro); }
}

export async function confirmarRegisto(req, res, next) {
  try {
    const utilizador = await servicoOtp.confirmarCriacaoConta(req.body);
    if (utilizador.perfil === 'EMPRESA_ADMIN') {
      return res.status(201).json({
        sucesso: true,
        dados: {
          id: utilizador.id,
          perfil: utilizador.perfil,
          empresaId: utilizador.empresaId,
          estadoCadastro: 'PENDENTE',
          mensagem: 'Empresa registada. Aguarde a aprovação do administrador da plataforma antes de iniciar sessão.'
        }
      });
    }
    return res.status(201).json({ sucesso: true, dados: await servico.obterPerfil(utilizador.id) });
  } catch (erro) { return next(erro); }
}

export async function solicitarRecuperacao(req, res, next) {
  try {
    return res.json({ sucesso: true, dados: await servicoOtp.solicitarRecuperacaoPalavraPasse(req.body) });
  } catch (erro) { return next(erro); }
}

export async function confirmarRecuperacao(req, res, next) {
  try {
    return res.json({ sucesso: true, dados: await servicoOtp.confirmarRecuperacaoPalavraPasse(req.body) });
  } catch (erro) { return next(erro); }
}

export async function iniciarSessao(req, res, next) {
  try {
    const resultado = await servico.iniciarSessao(req.body);
    return res.json({ sucesso: true, dados: resultado });
  } catch (erro) { return next(erro); }
}

export async function obterPerfil(req, res, next) {
  try {
    const utilizador = await servico.obterPerfil(req.utilizador.id);
    return res.json({ sucesso: true, dados: utilizador });
  } catch (erro) { return next(erro); }
}

export async function actualizarPerfil(req, res, next) {
  try {
    const utilizador = await servico.actualizarPerfil(req.utilizador.id, req.body);
    return res.json({ sucesso: true, dados: utilizador });
  } catch (erro) { return next(erro); }
}

export async function alterarPalavraPasse(req, res, next) {
  try {
    const resultado = await servicoOtp.confirmarAlteracaoPalavraPasse(req.utilizador.id, req.body);
    return res.json({ sucesso: true, dados: resultado });
  } catch (erro) { return next(erro); }
}

export async function solicitarOtpAlteracaoPalavraPasse(req, res, next) {
  try {
    const resultado = await servicoOtp.solicitarAlteracaoPalavraPasse(req.utilizador.id);
    return res.json({ sucesso: true, dados: resultado });
  } catch (erro) { return next(erro); }
}
