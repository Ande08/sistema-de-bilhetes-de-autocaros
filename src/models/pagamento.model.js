import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Pagamento extends Model {}

Pagamento.init({
  bilheteId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  metodo: { type: DataTypes.ENUM('MPESA', 'EMOLA', 'CARTAO'), allowNull: false },
  referencia: { type: DataTypes.STRING(60), allowNull: false, unique: true },
  valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  estado: { type: DataTypes.ENUM('PENDENTE', 'APROVADO', 'REJEITADO'), defaultValue: 'PENDENTE' }
}, { sequelize, modelName: 'Pagamento', tableName: 'pagamentos' });
