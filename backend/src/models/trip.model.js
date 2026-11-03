import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Trip extends Model {}

Trip.init({
  empresaId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'empresa_id' },
  routeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'rota_id' },
  busId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'autocarro_id' },
  departureAt: { type: DataTypes.DATE, allowNull: false, field: 'partida_em' },
  arrivalExpectedAt: { type: DataTypes.DATE, allowNull: true, field: 'chegada_prevista_em' },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'preco' },
  recurrenceType: { type: DataTypes.ENUM('UNICA', 'DIARIA', 'SEMANAL'), allowNull: false, defaultValue: 'UNICA', field: 'tipo_recorrencia' },
  recurrenceGroupId: { type: DataTypes.STRING(36), allowNull: true, field: 'grupo_recorrencia' },
  recurrenceDays: { type: DataTypes.STRING(32), allowNull: true, field: 'dias_recorrencia' },
  recurrenceStart: { type: DataTypes.DATEONLY, allowNull: true, field: 'recorrencia_inicio' },
  recurrenceEnd: { type: DataTypes.DATEONLY, allowNull: true, field: 'recorrencia_fim' },
  status: { type: DataTypes.ENUM('AGENDADA', 'EM_CURSO', 'CONCLUIDA', 'CANCELADA'), defaultValue: 'AGENDADA', field: 'estado' }
}, { sequelize, modelName: 'Trip', tableName: 'viagens' });
