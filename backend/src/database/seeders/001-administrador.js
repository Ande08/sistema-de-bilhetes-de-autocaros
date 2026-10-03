import bcrypt from 'bcryptjs';
import { User } from '../../models/index.js';

export async function executar({ transaction }) {
  const nome = process.env.ADMIN_NOME;
  const email = process.env.ADMIN_EMAIL;
  const palavraPasse = process.env.ADMIN_PASSWORD;

  if (!nome || !email || !palavraPasse) {
    throw new Error('ADMIN_NOME, ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórios para criar o administrador.');
  }

  const palavraPasseHash = await bcrypt.hash(palavraPasse, 12);
  await User.findOrCreate({
    where: { email },
    defaults: { nome, email, palavraPasseHash, perfil: 'ADMIN', activo: true },
    transaction
  });
}
