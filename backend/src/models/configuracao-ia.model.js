import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class ConfiguracaoIa extends Model {}

ConfiguracaoIa.init({
  id: { type: DataTypes.TINYINT.UNSIGNED, primaryKey: true, defaultValue: 1 },
  fornecedor: { type: DataTypes.ENUM('OPENROUTER'), allowNull: false, defaultValue: 'OPENROUTER' },
  modelo: { type: DataTypes.STRING(180), allowNull: false, defaultValue: 'deepseek/deepseek-chat' },
  apiKeyEncriptada: { type: DataTypes.TEXT, allowNull: true, field: 'api_key_encriptada' },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  actualizadoPor: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'actualizado_por' }
}, { sequelize, modelName: 'ConfiguracaoIa', tableName: 'configuracoes_ia' });
