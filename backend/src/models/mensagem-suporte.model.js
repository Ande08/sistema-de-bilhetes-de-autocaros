import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class MensagemSuporte extends Model {}

MensagemSuporte.init({
  ticketId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'ticket_id' },
  remetenteId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'remetente_id' },
  autorTipo: { type: DataTypes.ENUM('PASSAGEIRO', 'GESTOR_SUPORTE', 'ADMIN', 'IA', 'SISTEMA'), allowNull: false, field: 'autor_tipo' },
  conteudo: { type: DataTypes.TEXT, allowNull: false },
  imagemUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'imagem_url' },
  imagemNome: { type: DataTypes.STRING(180), allowNull: true, field: 'imagem_nome' },
  lidaEm: { type: DataTypes.DATE, allowNull: true, field: 'lida_em' }
}, { sequelize, modelName: 'MensagemSuporte', tableName: 'mensagens_suporte', updatedAt: false });
