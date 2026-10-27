import QRCode from 'qrcode';

// Gera um PDF autónomo sem depender de serviços externos. A estrutura utiliza
// fontes padrão do PDF, por isso o bilhete abre em navegadores e leitores móveis.
export function gerarBilhetePdf({ bilhete, empresa, rota, viagem, assento, pagamento }) {
  const dataPartida = formatarDataHora(viagem.partidaEm || viagem.departureAt);
  const emitidoEm = formatarDataHora(bilhete.createdAt || new Date());
  const estadoPagamento = pagamento?.estado || 'NÃO INFORMADO';
  const linhas = [
    ['Passageiro', bilhete.nomePassageiro],
    ['Empresa', empresa?.nome || 'Empresa de transporte'],
    ['Origem', `${rota.originProvince || ''}${rota.originProvince ? ' - ' : ''}${rota.origin}`],
    ['Destino', `${rota.destinationProvince || ''}${rota.destinationProvince ? ' - ' : ''}${rota.destination}`],
    ['Partida', dataPartida],
    ['Assento', `${assento.numero}${assento.juntoJanela ? ' - junto à janela' : ''}`],
    ['Valor', formatarMeticais(bilhete.preco)],
    ['Estado do bilhete', traduzirEstado(bilhete.estado)],
    ['Pagamento', traduzirEstado(estadoPagamento)]
  ];

  const comandos = [];
  comandos.push('0.965 0.984 1 rg 0 0 595 842 re f');
  comandos.push('0.035 0.337 0.753 rg 0 692 595 150 re f');
  comandos.push(textoPdf('VIAGEM BUS', 46, 790, 23, 'F2', [1, 1, 1]));
  comandos.push(textoPdf('BILHETE ELETRÓNICO', 46, 758, 12, 'F1', [0.82, 0.92, 1]));
  comandos.push(textoPdf('Apresente este documento no embarque', 46, 725, 10, 'F1', [1, 1, 1]));

  // Cartão central com o código, fácil de localizar durante a validação.
  comandos.push('1 1 1 rg 35 594 525 75 re f');
  comandos.push('0.55 0.75 0.92 RG 35 594 525 75 re S');
  comandos.push(textoPdf('CÓDIGO DO BILHETE', 54, 642, 9, 'F1', [0.35, 0.48, 0.6]));
  comandos.push(textoPdf(bilhete.codigo, 54, 615, 18, 'F2', [0.03, 0.34, 0.69]));

  let y = 555;
  for (const [rotulo, valor] of linhas) {
    comandos.push(textoPdf(rotulo.toUpperCase(), 48, y, 8, 'F1', [0.38, 0.5, 0.61]));
    comandos.push(textoPdf(valor || '-', 205, y - 1, 11, 'F2', [0.06, 0.19, 0.33]));
    comandos.push('0.82 0.9 0.96 RG 48 ' + (y - 13) + ' m 547 ' + (y - 13) + ' l S');
    y -= 36;
  }

  // O QR fica depois de todos os detalhes e contém somente o identificador do
  // bilhete. Não inclui nome, telefone nem dados de pagamento do passageiro.
  comandos.push(desenharQrPdf(`VIAGEM_BUS|BILHETE|${bilhete.codigo}`, 247.5, 130, 100));
  comandos.push(textoPdf('VALIDAÇÃO DO BILHETE', 240, 115, 8, 'F2', [0.13, 0.36, 0.57]));

  comandos.push('0.91 0.97 1 rg 35 42 525 58 re f');
  comandos.push(textoPdf('Documento emitido em ' + emitidoEm, 54, 76, 9, 'F1', [0.25, 0.4, 0.53]));
  comandos.push(textoPdf('Guarde o código para consultas e suporte.', 54, 57, 9, 'F2', [0.04, 0.35, 0.67]));
  comandos.push(textoPdf('Sistema académico de bilhetes - valores em meticais (MT)', 46, 19, 8, 'F1', [0.42, 0.5, 0.58]));

  return montarPdf(comandos.join('\n'));
}

function desenharQrPdf(conteudo, x, y, tamanho) {
  const qr = QRCode.create(conteudo, { errorCorrectionLevel: 'M' });
  const margem = 4;
  const totalModulos = qr.modules.size + margem * 2;
  const modulo = tamanho / totalModulos;
  const comandos = ['% QR-CODE', `1 1 1 rg ${x} ${y} ${tamanho} ${tamanho} re f`, '0.02 0.12 0.23 rg'];

  for (let linha = 0; linha < qr.modules.size; linha += 1) {
    for (let coluna = 0; coluna < qr.modules.size; coluna += 1) {
      if (!qr.modules.data[linha * qr.modules.size + coluna]) continue;
      const posicaoX = x + (coluna + margem) * modulo;
      const posicaoY = y + (qr.modules.size - linha - 1 + margem) * modulo;
      comandos.push(`${posicaoX.toFixed(3)} ${posicaoY.toFixed(3)} ${modulo.toFixed(3)} ${modulo.toFixed(3)} re f`);
    }
  }
  return comandos.join('\n');
}

function textoPdf(valor, x, y, tamanho, fonte, cor) {
  const [r, g, b] = cor;
  return `${r} ${g} ${b} rg BT /${fonte} ${tamanho} Tf 1 0 0 1 ${x} ${y} Tm (${escaparTexto(valor)}) Tj ET`;
}

function escaparTexto(valor) {
  // As fontes padrão usam WinAnsi; os caracteres fora dessa faixa recebem uma
  // alternativa legível para impedir glifos quebrados no bilhete.
  return String(valor ?? '-')
    .replace(/→/g, '->')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\xFF]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function formatarMeticais(valor) {
  return `${Number(valor || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
}

function formatarDataHora(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-MZ', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Maputo'
  }).format(data);
}

function traduzirEstado(estado) {
  return {
    EMITIDO: 'Emitido', RESERVADO: 'Reservado', CANCELADO: 'Cancelado',
    UTILIZADO: 'Utilizado', APROVADO: 'Aprovado', PENDENTE: 'Pendente',
    REJEITADO: 'Rejeitado', REEMBOLSADO: 'Reembolsado'
  }[estado] || String(estado || '-');
}

function montarPdf(conteudo) {
  const stream = Buffer.from(conteudo, 'latin1');
  const objectos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, 'ascii'), stream, Buffer.from('\nendstream', 'ascii')])
  ];
  const partes = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  const offsets = [0];
  let tamanho = partes[0].length;
  objectos.forEach((objecto, indice) => {
    offsets.push(tamanho);
    const corpo = Buffer.isBuffer(objecto) ? objecto : Buffer.from(objecto, 'latin1');
    const parte = Buffer.concat([
      Buffer.from(`${indice + 1} 0 obj\n`, 'ascii'), corpo, Buffer.from('\nendobj\n', 'ascii')
    ]);
    partes.push(parte);
    tamanho += parte.length;
  });
  const inicioXref = tamanho;
  const xref = ['xref', `0 ${objectos.length + 1}`, '0000000000 65535 f '];
  offsets.slice(1).forEach((offset) => xref.push(`${String(offset).padStart(10, '0')} 00000 n `));
  xref.push('trailer', `<< /Size ${objectos.length + 1} /Root 1 0 R >>`, 'startxref', String(inicioXref), '%%EOF');
  partes.push(Buffer.from(`${xref.join('\n')}\n`, 'ascii'));
  return Buffer.concat(partes);
}
