import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class AvaliacaoEmpresa extends Model {}

AvaliacaoEmpresa.init({
  empresaId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'empresa_id' },
  utilizadorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'utilizador_id' },
  classificacao: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, validate: { min: 1, max: 5 } },
  comentario: { type: DataTypes.STRING(600), allowNull: true }
}, { sequelize, modelName: 'AvaliacaoEmpresa', tableName: 'avaliacoes_empresas' });
