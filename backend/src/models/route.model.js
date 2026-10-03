import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Route extends Model {}

Route.init({
  origin: { type: DataTypes.STRING(100), allowNull: false, field: 'origem' },
  destination: { type: DataTypes.STRING(100), allowNull: false, field: 'destino' },
  distanceKm: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'distancia_km' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'activa' }
}, { sequelize, modelName: 'Route', tableName: 'rotas' });
