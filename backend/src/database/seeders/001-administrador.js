import bcrypt from 'bcryptjs';
import { Empresa, User } from '../../models/index.js';

export async function executar({ transaction }) {
  const nome = process.env.ADMIN_NOME;
  const apelido = process.env.ADMIN_APELIDO;
  const telefone = process.env.ADMIN_TELEFONE;
  const palavraPasse = process.env.ADMIN_PASSWORD;

  if (!nome || !apelido || !telefone || !palavraPasse) {
    throw new Error('ADMIN_NOME, ADMIN_APELIDO, ADMIN_TELEFONE e ADMIN_PASSWORD são obrigatórios para criar o administrador.');
  }

  const palavraPasseHash = await bcrypt.hash(palavraPasse, 12);
  const empresa = await Empresa.findOne({ where: { slug: 'viagem-bus' }, transaction });
  await User.findOrCreate({
    where: { telefone },
    defaults: { nome, apelido, telefone, palavraPasseHash, perfil: 'ADMIN', empresaId: empresa?.id || null, activo: true },
    transaction
  });
}
