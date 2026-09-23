import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Trip extends Model {}

Trip.init({
  routeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  busId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  departureAt: { type: DataTypes.DATE, allowNull: false },
  arrivalExpectedAt: { type: DataTypes.DATE, allowNull: true },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.ENUM('AGENDADA', 'EM_CURSO', 'CONCLUIDA', 'CANCELADA'), defaultValue: 'AGENDADA' }
}, { sequelize, modelName: 'Trip', tableName: 'viagens' });
