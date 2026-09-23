import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class User extends Model {}

User.init({
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(180), allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false },
  profile: { type: DataTypes.ENUM('PASSAGEIRO', 'ADMIN'), allowNull: false, defaultValue: 'PASSAGEIRO' }
}, { sequelize, modelName: 'User', tableName: 'utilizadores' });
