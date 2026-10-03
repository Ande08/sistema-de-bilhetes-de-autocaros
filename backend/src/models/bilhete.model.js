import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Bilhete extends Model {}

Bilhete.init({
  codigo: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  utilizadorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  viagemId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  assentoId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  nomePassageiro: { type: DataTypes.STRING(120), allowNull: false },
  preco: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  estado: { type: DataTypes.ENUM('RESERVADO', 'EMITIDO', 'CANCELADO'), defaultValue: 'RESERVADO' }
}, {
  sequelize,
  modelName: 'Bilhete',
  tableName: 'bilhetes',
  // Garante no banco que um assento não seja vendido duas vezes na mesma viagem.
  indexes: [{ unique: true, fields: ['viagem_id', 'assento_id'], name: 'uq_bilhete_viagem_assento' }]
});
