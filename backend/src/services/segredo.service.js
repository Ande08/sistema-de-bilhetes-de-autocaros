import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// A chave de cifragem é derivada do segredo JWT já obrigatório no ambiente.
function obterChaveMestra() {
  return createHash('sha256').update(String(process.env.JWT_SECRET || '')).digest();
}

export function encriptarSegredo(valor) {
  if (!valor) return null;
  const iv = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', obterChaveMestra(), iv);
  const conteudo = Buffer.concat([cifra.update(String(valor), 'utf8'), cifra.final()]);
  return ['v1', iv.toString('base64'), cifra.getAuthTag().toString('base64'), conteudo.toString('base64')].join(':');
}

export function desencriptarSegredo(valor) {
  if (!valor) return null;
  const [versao, iv, etiqueta, conteudo] = String(valor).split(':');
  if (versao !== 'v1' || !iv || !etiqueta || !conteudo) throw new Error('O segredo guardado possui um formato inválido.');
  const decifra = createDecipheriv('aes-256-gcm', obterChaveMestra(), Buffer.from(iv, 'base64'));
  decifra.setAuthTag(Buffer.from(etiqueta, 'base64'));
  return Buffer.concat([decifra.update(Buffer.from(conteudo, 'base64')), decifra.final()]).toString('utf8');
}
