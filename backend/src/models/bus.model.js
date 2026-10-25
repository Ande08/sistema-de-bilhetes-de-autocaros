import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Bus extends Model {}

Bus.init({
  registration: { type: DataTypes.STRING(30), allowNull: false, unique: true, field: 'matricula' },
  model: { type: DataTypes.STRING(100), allowNull: false, field: 'modelo' },
  capacity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'capacidade' },
  seatsLeft: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 2, field: 'lugares_esquerda' },
  seatsRight: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 2, field: 'lugares_direita' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'activo' }
}, { sequelize, modelName: 'Bus', tableName: 'autocarros' });
