import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class User extends Model {}

User.init({
  nome: { type: DataTypes.STRING(80), allowNull: false, field: 'nome' },
  apelido: { type: DataTypes.STRING(120), allowNull: false, field: 'apelido' },
  telefone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  // Mantido apenas para compatibilidade com dados antigos; já não é usado no acesso.
  email: { type: DataTypes.STRING(180), allowNull: true, unique: true, validate: { isEmail: true } },
  palavraPasseHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  perfil: { type: DataTypes.ENUM('PASSAGEIRO', 'GESTOR_SUPORTE', 'ADMIN'), allowNull: false, defaultValue: 'PASSAGEIRO', field: 'perfil' },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { sequelize, modelName: 'User', tableName: 'utilizadores' });
