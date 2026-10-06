import { servicoWhatsApp } from '../integrations/whatsapp/whatsapp.service.js';

export function obterEstadoWhatsApp(_req, res) {
  return res.json({ sucesso: true, dados: { ...servicoWhatsApp.obterEstado(), fornecedorOtp: process.env.OTP_FORNECEDOR || 'SIMULADO' } });
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
