// A sigla apresentada no sistema é MT, conforme a convenção definida para o projeto.
export function formatarValor(valor) {
  const numero = Number(valor);
  const seguro = Number.isFinite(numero) ? numero : 0;
  return `${new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(seguro)} MT`;
}
