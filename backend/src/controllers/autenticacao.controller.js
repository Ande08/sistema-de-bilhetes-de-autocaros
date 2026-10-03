import { ServicoAutenticacao } from '../services/autenticacao.service.js';

const servico = new ServicoAutenticacao();

export async function registar(req, res, next) {
  try {
    const { nome, email, palavraPasse } = req.body;
    if (!nome || !email || !palavraPasse) {
      const erro = new Error('Nome, email e palavra-passe são obrigatórios.');
      erro.statusCode = 400;
      throw erro;
    }
    const utilizador = await servico.registar({ nome, email, palavraPasse });
    return res.status(201).json({ sucesso: true, dados: utilizador });
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
    await servico.alterarPalavraPasse(req.utilizador.id, req.body);
    return res.json({ sucesso: true, dados: { mensagem: 'Palavra-passe alterada com sucesso.' } });
  } catch (erro) { return next(erro); }
}
