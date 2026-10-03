import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Trip extends Model {}

Trip.init({
  routeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'rota_id' },
  busId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'autocarro_id' },
  departureAt: { type: DataTypes.DATE, allowNull: false, field: 'partida_em' },
  arrivalExpectedAt: { type: DataTypes.DATE, allowNull: true, field: 'chegada_prevista_em' },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.ENUM('AGENDADA', 'EM_CURSO', 'CONCLUIDA', 'CANCELADA'), defaultValue: 'AGENDADA', field: 'estado' }
}, { sequelize, modelName: 'Trip', tableName: 'viagens' });
