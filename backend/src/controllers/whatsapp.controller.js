import { aguardarEstadoWhatsapp, garantirInstanciaWhatsappPm2, obterEstadoWhatsappGerido, renovarInstanciaWhatsappPm2 } from '../integrations/whatsapp/pm2-whatsapp.service.js';
import { obterResumoFilaWhatsapp, repetirEnvioWhatsapp } from '../services/fila-whatsapp.service.js';

export async function obterEstadoWhatsApp(_req, res, next) {
  try {
    return res.json({ sucesso: true, dados: { ...await obterEstadoWhatsappGerido(), fornecedorOtp: process.env.OTP_FORNECEDOR || 'SIMULADO', fila: await obterResumoFilaWhatsapp() } });
  } catch (erro) { return next(erro); }
}

export async function iniciarWhatsApp(req, res, next) {
  try {
    const limparSessao = req.body?.limparSessao === true;
    if (limparSessao) await renovarInstanciaWhatsappPm2();
    else await garantirInstanciaWhatsappPm2();
    const estado = await aguardarEstadoWhatsapp();
    return res.json({ sucesso: true, dados: { ...estado, fornecedorOtp: process.env.OTP_FORNECEDOR || 'SIMULADO', fila: await obterResumoFilaWhatsapp() } });
  } catch (erro) { return next(erro); }
}

export async function repetirEnvio(req, res, next) {
  try { return res.json({ sucesso: true, dados: await repetirEnvioWhatsapp(req.params.id) }); }
  catch (erro) { return next(erro); }
}
