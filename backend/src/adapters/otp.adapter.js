import { servicoWhatsApp } from '../integrations/whatsapp/whatsapp.service.js';

// Contrato isolado para permitir trocar o modo simulado por WhatsApp ou SMS
// sem alterar o serviço responsável pelo cadastro.
class AdaptadorOtpSimulado {
  async enviar({ telefone, codigo, canal }) {
    console.log(`[OTP SIMULADO] ${canal} para ${telefone}: ${codigo}`);
    return { fornecedor: 'SIMULADO', identificador: `sim-${Date.now()}` };
  }
}

class AdaptadorOtpWhatsApp {
  async enviar({ telefone, codigo, canal }) {
    if (canal !== 'WHATSAPP') {
      const erro = new Error('O envio por SMS ainda não está configurado. Selecione WhatsApp.');
      erro.statusCode = 503;
      throw erro;
    }
    return servicoWhatsApp.enviarOtp({
      telefone,
      codigo,
      validadeMinutos: Number(process.env.OTP_VALIDADE_MINUTOS) || 10
    });
  }
}

export function obterAdaptadorOtp() {
  const fornecedor = (process.env.OTP_FORNECEDOR || 'SIMULADO').toUpperCase();
  if (fornecedor === 'SIMULADO') return new AdaptadorOtpSimulado();
  if (fornecedor === 'WHATSAPP_BAILEYS') return new AdaptadorOtpWhatsApp();
  const erro = new Error(`Fornecedor OTP não configurado: ${fornecedor}.`);
  erro.statusCode = 503;
  throw erro;
}
