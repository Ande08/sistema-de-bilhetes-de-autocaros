import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Assento extends Model {}

Assento.init({
  autocarroId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  numero: { type: DataTypes.STRING(10), allowNull: false },
  fila: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  coluna: { type: DataTypes.STRING(2), allowNull: false },
  lado: { type: DataTypes.STRING(10), allowNull: false },
  juntoJanela: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'junto_janela' }
}, {
  sequelize,
  modelName: 'Assento',
  tableName: 'assentos',
  indexes: [{ unique: true, fields: ['autocarro_id', 'numero'] }]
});
