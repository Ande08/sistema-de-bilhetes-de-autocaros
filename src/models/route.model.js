import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Route extends Model {}

Route.init({
  origin: { type: DataTypes.STRING(100), allowNull: false },
  destination: { type: DataTypes.STRING(100), allowNull: false },
  distanceKm: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { sequelize, modelName: 'Route', tableName: 'rotas' });
