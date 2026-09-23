import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class User extends Model {}

User.init({
  nome: { type: DataTypes.STRING(120), allowNull: false, field: 'nome' },
  email: { type: DataTypes.STRING(180), allowNull: false, unique: true, validate: { isEmail: true } },
  palavraPasseHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  perfil: { type: DataTypes.ENUM('PASSAGEIRO', 'ADMIN'), allowNull: false, defaultValue: 'PASSAGEIRO', field: 'perfil' }
}, { sequelize, modelName: 'User', tableName: 'utilizadores' });
