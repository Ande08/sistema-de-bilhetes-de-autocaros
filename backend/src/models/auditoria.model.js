import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Auditoria extends Model {}

Auditoria.init({
  utilizadorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'utilizador_id' },
  operacao: { type: DataTypes.STRING(80), allowNull: false },
  entidade: { type: DataTypes.STRING(80), allowNull: false },
  entidadeId: { type: DataTypes.STRING(80), allowNull: true, field: 'entidade_id' },
  valoresAnteriores: { type: DataTypes.JSON, allowNull: true, field: 'valores_anteriores' },
  valoresNovos: { type: DataTypes.JSON, allowNull: true, field: 'valores_novos' },
  enderecoIp: { type: DataTypes.STRING(64), allowNull: true, field: 'endereco_ip' }
}, { sequelize, modelName: 'Auditoria', tableName: 'auditorias', updatedAt: false });
