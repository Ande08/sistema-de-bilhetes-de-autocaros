import bcrypt from 'bcryptjs';
import { User } from '../../models/index.js';

// Contas conhecidas para demonstrar os três perfis principais do sistema.
export async function executar({ transaction }) {
  const contas = [
    { nome: 'Administrador', apelido: 'Principal', telefone: '+258841111111', palavraPasse: 'Admin@123', perfil: 'ADMIN' },
    { nome: 'Cliente', apelido: 'Demonstração', telefone: '+258842222222', palavraPasse: 'Cliente@123', perfil: 'PASSAGEIRO' },
    { nome: 'Atendente', apelido: 'Demonstração', telefone: '+258843333333', palavraPasse: 'Atendente@123', perfil: 'GESTOR_SUPORTE' }
  ];

  for (const conta of contas) {
    const palavraPasseHash = await bcrypt.hash(conta.palavraPasse, 12);
    const [utilizador, criado] = await User.findOrCreate({
      where: { telefone: conta.telefone },
      defaults: {
        nome: conta.nome, apelido: conta.apelido, telefone: conta.telefone,
        palavraPasseHash, perfil: conta.perfil, activo: true
      },
      transaction
    });
    if (!criado) {
      await utilizador.update({ nome: conta.nome, apelido: conta.apelido, palavraPasseHash, perfil: conta.perfil, activo: true }, { transaction });
    }
  }
}
