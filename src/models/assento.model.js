import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Assento extends Model {}

Assento.init({
  autocarroId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  numero: { type: DataTypes.STRING(10), allowNull: false }
}, {
  sequelize,
  modelName: 'Assento',
  tableName: 'assentos',
  indexes: [{ unique: true, fields: ['autocarro_id', 'numero'] }]
});
