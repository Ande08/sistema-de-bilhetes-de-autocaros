// Contrato isolado para permitir trocar o modo simulado por Twilio, Meta WhatsApp
// ou um gateway SMS local sem alterar a autenticação.
class AdaptadorOtpSimulado {
  async enviar({ telefone, codigo, canal }) {
    console.log(`[OTP SIMULADO] ${canal} para ${telefone}: ${codigo}`);
    return { fornecedor: 'SIMULADO', identificador: `sim-${Date.now()}` };
  }
}

export function obterAdaptadorOtp() {
  const fornecedor = (process.env.OTP_FORNECEDOR || 'SIMULADO').toUpperCase();
  if (fornecedor === 'SIMULADO') return new AdaptadorOtpSimulado();
  const erro = new Error(`Fornecedor OTP não configurado: ${fornecedor}.`);
  erro.statusCode = 503;
  throw erro;
}
