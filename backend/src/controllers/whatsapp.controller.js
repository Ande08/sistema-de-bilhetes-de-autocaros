import { servicoWhatsApp } from '../integrations/whatsapp/whatsapp.service.js';
import { obterResumoFilaWhatsapp, repetirEnvioWhatsapp } from '../services/fila-whatsapp.service.js';

export async function obterEstadoWhatsApp(_req, res, next) {
  try {
    return res.json({ sucesso: true, dados: { ...servicoWhatsApp.obterEstado(), fornecedorOtp: process.env.OTP_FORNECEDOR || 'SIMULADO', fila: await obterResumoFilaWhatsapp() } });
  } catch (erro) { return next(erro); }
}

export async function iniciarWhatsApp(req, res, next) {
  try {
    const limparSessao = req.body?.limparSessao === true;
    const estado = limparSessao
      ? await servicoWhatsApp.reiniciar({ limparSessao: true })
      : await servicoWhatsApp.iniciar();
    return res.json({ sucesso: true, dados: { ...estado, fornecedorOtp: process.env.OTP_FORNECEDOR || 'SIMULADO' } });
  } catch (erro) { return next(erro); }
}

export async function repetirEnvio(req, res, next) {
  try { return res.json({ sucesso: true, dados: await repetirEnvioWhatsapp(req.params.id) }); }
  catch (erro) { return next(erro); }
}
