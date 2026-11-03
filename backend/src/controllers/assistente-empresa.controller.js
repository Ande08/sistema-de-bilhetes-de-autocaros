import { obterAnaliseEmpresa, perguntarAssistenteEmpresa } from '../services/assistente-empresa.service.js';
import { gerarRelatorioFinanceiroPdf, obterDadosRelatorioFinanceiro } from '../services/relatorio-financeiro.service.js';

export async function obterAnalise(req, res, next) {
  try { return res.json({ sucesso: true, dados: await obterAnaliseEmpresa(req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function perguntar(req, res, next) {
  try { return res.json({ sucesso: true, dados: await perguntarAssistenteEmpresa(req.utilizador, req.body.pergunta) }); }
  catch (erro) { return next(erro); }
}

export async function descarregarRelatorioFinanceiro(req, res, next) {
  try {
    const dados = await obterDadosRelatorioFinanceiro(req.utilizador, req.query);
    const pdf = await gerarRelatorioFinanceiroPdf(dados);
    const nome = dados.empresa.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'empresa';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio-financeiro-${nome}.pdf"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'private, no-store'
    });
    return res.send(pdf);
  } catch (erro) { return next(erro); }
}
