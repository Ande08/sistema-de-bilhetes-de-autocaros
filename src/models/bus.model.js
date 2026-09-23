import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Bus extends Model {}

Bus.init({
  registration: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  model: { type: DataTypes.STRING(100), allowNull: false },
  capacity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { sequelize, modelName: 'Bus', tableName: 'autocarros' });
