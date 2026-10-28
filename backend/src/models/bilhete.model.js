import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Bilhete extends Model {}

Bilhete.init({
  codigo: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  utilizadorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  viagemId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  assentoId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  cupaoId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'cupao_id' },
  nomePassageiro: { type: DataTypes.STRING(120), allowNull: false },
  preco: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  precoOriginal: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'preco_original' },
  desconto: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  estado: { type: DataTypes.ENUM('RESERVADO', 'EMITIDO', 'CANCELADO', 'UTILIZADO'), defaultValue: 'RESERVADO' }
}, {
  sequelize,
  modelName: 'Bilhete',
  tableName: 'bilhetes'
});
