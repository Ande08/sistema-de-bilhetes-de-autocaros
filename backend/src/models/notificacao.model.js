import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Notificacao extends Model {}

Notificacao.init({
  utilizadorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'utilizador_id' },
  titulo: { type: DataTypes.STRING(140), allowNull: false },
  mensagem: { type: DataTypes.TEXT, allowNull: false },
  tipo: { type: DataTypes.STRING(40), allowNull: false },
  lidaEm: { type: DataTypes.DATE, allowNull: true, field: 'lida_em' }
}, { sequelize, modelName: 'Notificacao', tableName: 'notificacoes' });
