import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Reserva extends Model {}

Reserva.init({
  utilizadorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'utilizador_id' },
  viagemId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'viagem_id' },
  assentoId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'assento_id' },
  estado: { type: DataTypes.ENUM('PENDENTE', 'CONFIRMADA', 'EXPIRADA', 'CANCELADA'), allowNull: false, defaultValue: 'PENDENTE' },
  expiraEm: { type: DataTypes.DATE, allowNull: false, field: 'expira_em' }
}, {
  sequelize,
  modelName: 'Reserva',
  tableName: 'reservas',
  indexes: [{ unique: true, fields: ['viagem_id', 'assento_id'] }]
});
