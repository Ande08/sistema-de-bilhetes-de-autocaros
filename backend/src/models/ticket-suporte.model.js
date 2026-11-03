import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class TicketSuporte extends Model {}

TicketSuporte.init({
  empresaId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'empresa_id' },
  codigo: { type: DataTypes.STRING(32), allowNull: false, unique: true },
  utilizadorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'utilizador_id' },
  bilheteId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'bilhete_id' },
  gestorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'gestor_id' },
  assunto: { type: DataTypes.STRING(160), allowNull: false },
  categoria: { type: DataTypes.ENUM('BILHETE', 'PAGAMENTO', 'VIAGEM', 'CONTA', 'RECLAMACAO', 'OUTRO'), allowNull: false, defaultValue: 'OUTRO' },
  prioridade: { type: DataTypes.ENUM('BAIXA', 'NORMAL', 'ALTA', 'URGENTE'), allowNull: false, defaultValue: 'NORMAL' },
  prioridadePontuacao: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 50, field: 'prioridade_pontuacao' },
  prioridadeMotivo: { type: DataTypes.STRING(255), allowNull: true, field: 'prioridade_motivo' },
  estado: { type: DataTypes.ENUM('ABERTO', 'EM_ATENDIMENTO', 'AGUARDA_UTILIZADOR', 'RESOLVIDO', 'ENCERRADO'), allowNull: false, defaultValue: 'ABERTO' },
  resolvidoEm: { type: DataTypes.DATE, allowNull: true, field: 'resolvido_em' },
  encerradoEm: { type: DataTypes.DATE, allowNull: true, field: 'encerrado_em' }
}, { sequelize, modelName: 'TicketSuporte', tableName: 'tickets_suporte' });
