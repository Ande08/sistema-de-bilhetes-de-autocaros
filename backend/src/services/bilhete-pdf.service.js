import QRCode from 'qrcode';

// Gera um talão de 80 mm, largura usada pelas impressoras térmicas POS. O fundo
// branco, o texto preto e as linhas simples reduzem o consumo e preservam a
// leitura em equipamentos térmicos monocromáticos.
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

  const comandos = ['1 1 1 rg 0 0 226.772 595.276 re f'];
  comandos.push(textoPdf(textoAjustado(empresa?.nome || 'VIAGEM BUS', 28), 14, 570, 14, 'F2', [0, 0, 0]));
  comandos.push(textoPdf('BILHETE DE VIAGEM', 14, 550, 10, 'F2', [0, 0, 0]));
  comandos.push(textoPdf('Apresente no embarque', 14, 535, 8, 'F1', [0, 0, 0]));
  comandos.push('0 0 0 RG 14 525 m 212.772 525 l S');
  comandos.push(textoPdf('CODIGO', 14, 508, 7, 'F1', [0, 0, 0]));
  comandos.push(textoPdf(textoAjustado(bilhete.codigo, 24), 14, 488, 13, 'F2', [0, 0, 0]));
  comandos.push('0 0 0 RG 14 478 m 212.772 478 l S');

  let y = 460;
  for (const [rotulo, valor] of linhas) {
    comandos.push(textoPdf(rotulo.toUpperCase(), 14, y, 6.5, 'F1', [0, 0, 0]));
    comandos.push(textoPdf(textoAjustado(valor || '-', 35), 14, y - 13, 8.5, 'F2', [0, 0, 0]));
    comandos.push('0.72 0.72 0.72 RG 14 ' + (y - 19) + ' m 212.772 ' + (y - 19) + ' l S');
    y -= 32;
  }

  // O QR aparece no fim dos detalhes e contém apenas o identificador do
  // bilhete, nunca dados pessoais nem referências de pagamento.
  comandos.push(desenharQrPdf(`VIAGEM_BUS|BILHETE|${bilhete.codigo}`, 68.386, 61, 90));
  comandos.push(textoPdf('QR PARA VALIDACAO', 72, 48, 7, 'F2', [0, 0, 0]));
  comandos.push(textoPdf(textoAjustado(`Emitido: ${emitidoEm}`, 39), 14, 30, 6.5, 'F1', [0, 0, 0]));
  comandos.push(textoPdf('Valores em meticais (MT)', 14, 18, 6.5, 'F1', [0, 0, 0]));
  comandos.push(textoPdf('Guarde este talao.', 14, 8, 6.5, 'F2', [0, 0, 0]));

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

function textoAjustado(valor, limite) {
  const texto = String(valor ?? '-');
  return texto.length > limite ? `${texto.slice(0, limite - 3)}...` : texto;
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
    // 226,772 x 595,276 pontos correspondem a 80 x 210 mm.
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 226.772 595.276] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
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
