import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Cupao extends Model {}

Cupao.init({
  empresaId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'empresa_id' },
  codigo: { type: DataTypes.STRING(30), allowNull: false },
  descricao: { type: DataTypes.STRING(200), allowNull: true },
  percentagem: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  validoDe: { type: DataTypes.DATE, allowNull: false, field: 'valido_de' },
  validoAte: { type: DataTypes.DATE, allowNull: false, field: 'valido_ate' },
  valorMinimo: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'valor_minimo' },
  limiteUtilizacoes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'limite_utilizacoes' },
  limitePorUtilizador: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1, field: 'limite_por_utilizador' },
  totalUtilizacoes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'total_utilizacoes' },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { sequelize, modelName: 'Cupao', tableName: 'cupoes' });
