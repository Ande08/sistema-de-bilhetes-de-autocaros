import { Assento, Bilhete, Empresa, Pagamento, Route, Trip } from '../models/index.js';

// A consulta pública devolve apenas os dados necessários para confirmar a
// autenticidade. Nome, telefone, preço, cupão e referência de pagamento não
// fazem parte da resposta.
export async function obterValidacaoPublicaBilhete(codigo) {
  const codigoNormalizado = String(codigo || '').trim().toUpperCase();
  if (!/^BIL-[A-Z0-9_-]{3,36}$/.test(codigoNormalizado)) return null;

  const bilhete = await Bilhete.findOne({
    where: { codigo: codigoNormalizado },
    attributes: ['codigo', 'estado', 'createdAt'],
    include: [
      { model: Pagamento, attributes: ['estado'] },
      { model: Assento, attributes: ['numero', 'juntoJanela'] },
      {
        model: Trip,
        attributes: ['id', 'departureAt', 'status'],
        include: [
          { model: Route, attributes: ['origin', 'destination', 'originProvince', 'destinationProvince'] },
          { model: Empresa, attributes: ['nome', 'slug', 'logoUrl'] }
        ]
      }
    ]
  });
  return bilhete ? construirResultadoValidacao(bilhete) : null;
}

export function construirResultadoValidacao(registo) {
  const bilhete = registo.toJSON ? registo.toJSON() : registo;
  const viagem = bilhete.Trip || bilhete.viagem || {};
  const rota = viagem.Route || viagem.rota || {};
  const empresa = viagem.Empresa || viagem.empresa || {};
  const assento = bilhete.Assento || bilhete.assento || {};
  const pagamento = bilhete.Pagamento || bilhete.pagamento || {};
  const situacao = determinarSituacao({ estadoBilhete: bilhete.estado, estadoViagem: viagem.status, estadoPagamento: pagamento.estado });

  return {
    autentico: true,
    validoParaEmbarque: situacao.codigo === 'VALIDO',
    situacao,
    bilhete: { codigo: bilhete.codigo, estado: bilhete.estado, emitidoEm: bilhete.createdAt || null },
    empresa: { nome: empresa.nome || 'Empresa de transporte', slug: empresa.slug || null, logoUrl: empresa.logoUrl || null },
    viagem: {
      id: viagem.id,
      estado: viagem.status,
      partidaEm: viagem.departureAt,
      origem: rota.origin,
      origemProvincia: rota.originProvince,
      destino: rota.destination,
      destinoProvincia: rota.destinationProvince
    },
    assento: { numero: assento.numero || '-', juntoJanela: Boolean(assento.juntoJanela) }
  };
}

function determinarSituacao({ estadoBilhete, estadoViagem, estadoPagamento }) {
  if (estadoBilhete === 'CANCELADO' || estadoViagem === 'CANCELADA') return { codigo: 'CANCELADO', mensagem: 'Este bilhete ou a respetiva viagem foi cancelado.' };
  if (estadoBilhete === 'UTILIZADO') return { codigo: 'UTILIZADO', mensagem: 'Este bilhete é autêntico, mas já foi utilizado.' };
  if (estadoViagem === 'CONCLUIDA') return { codigo: 'VIAGEM_CONCLUIDA', mensagem: 'Este bilhete é autêntico e pertence a uma viagem já concluída.' };
  if (estadoPagamento !== 'APROVADO') return { codigo: 'PAGAMENTO_NAO_CONFIRMADO', mensagem: 'O pagamento deste bilhete não está confirmado.' };
  if (estadoBilhete === 'EMITIDO' && estadoViagem === 'AGENDADA') return { codigo: 'VALIDO', mensagem: 'Bilhete autêntico e válido para esta viagem.' };
  return { codigo: 'NAO_VALIDO', mensagem: 'O bilhete existe, mas o seu estado atual não permite o embarque.' };
}
