import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class TicketSuporte extends Model {}

TicketSuporte.init({
  codigo: { type: DataTypes.STRING(32), allowNull: false, unique: true },
  utilizadorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'utilizador_id' },
  gestorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'gestor_id' },
  assunto: { type: DataTypes.STRING(160), allowNull: false },
  categoria: { type: DataTypes.ENUM('BILHETE', 'PAGAMENTO', 'VIAGEM', 'CONTA', 'RECLAMACAO', 'OUTRO'), allowNull: false, defaultValue: 'OUTRO' },
  prioridade: { type: DataTypes.ENUM('BAIXA', 'NORMAL', 'ALTA', 'URGENTE'), allowNull: false, defaultValue: 'NORMAL' },
  estado: { type: DataTypes.ENUM('ABERTO', 'EM_ATENDIMENTO', 'AGUARDA_UTILIZADOR', 'RESOLVIDO', 'ENCERRADO'), allowNull: false, defaultValue: 'ABERTO' },
  resolvidoEm: { type: DataTypes.DATE, allowNull: true, field: 'resolvido_em' },
  encerradoEm: { type: DataTypes.DATE, allowNull: true, field: 'encerrado_em' }
}, { sequelize, modelName: 'TicketSuporte', tableName: 'tickets_suporte' });
