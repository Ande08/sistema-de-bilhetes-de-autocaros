import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class VerificacaoOtp extends Model {}

VerificacaoOtp.init({
  telefone: { type: DataTypes.STRING(20), allowNull: false },
  finalidade: { type: DataTypes.ENUM('CRIAR_CONTA'), allowNull: false, defaultValue: 'CRIAR_CONTA' },
  canal: { type: DataTypes.ENUM('WHATSAPP', 'SMS'), allowNull: false },
  codigoHash: { type: DataTypes.STRING(255), allowNull: false, field: 'codigo_hash' },
  nome: { type: DataTypes.STRING(80), allowNull: false },
  apelido: { type: DataTypes.STRING(120), allowNull: false },
  palavraPasseHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  tentativas: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  expiraEm: { type: DataTypes.DATE, allowNull: false, field: 'expira_em' },
  consumidoEm: { type: DataTypes.DATE, allowNull: true, field: 'consumido_em' }
}, { sequelize, modelName: 'VerificacaoOtp', tableName: 'verificacoes_otp' });
