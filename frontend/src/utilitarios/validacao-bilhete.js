export function extrairCodigoValidacaoBilhete(caminho) {
  const correspondencia = String(caminho || '').match(/^\/validar-bilhete\/([^/?#]+)\/?$/i);
  if (!correspondencia) return null;
  try { return decodeURIComponent(correspondencia[1]).trim().toUpperCase(); }
  catch { return null; }
}
