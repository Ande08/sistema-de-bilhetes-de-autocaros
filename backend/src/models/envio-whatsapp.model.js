import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class EnvioWhatsapp extends Model {}

EnvioWhatsapp.init({
  tipo: { type: DataTypes.ENUM('OTP', 'AVISO_VIAGEM'), allowNull: false },
  utilizadorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'utilizador_id' },
  viagemId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'viagem_id' },
  telefone: { type: DataTypes.STRING(20), allowNull: false },
  mensagem: { type: DataTypes.TEXT, allowNull: false },
  chaveIdempotencia: { type: DataTypes.STRING(180), allowNull: false, unique: true, field: 'chave_idempotencia' },
  estado: { type: DataTypes.ENUM('PENDENTE', 'PROCESSANDO', 'ENVIADO', 'FALHADO', 'EXPIRADO'), allowNull: false, defaultValue: 'PENDENTE' },
  prioridade: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 10 },
  tentativas: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  maxTentativas: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 8, field: 'max_tentativas' },
  proximaTentativaEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'proxima_tentativa_em' },
  expiraEm: { type: DataTypes.DATE, allowNull: true, field: 'expira_em' },
  enviadoEm: { type: DataTypes.DATE, allowNull: true, field: 'enviado_em' },
  ultimoErro: { type: DataTypes.STRING(500), allowNull: true, field: 'ultimo_erro' },
  identificadorFornecedor: { type: DataTypes.STRING(180), allowNull: true, field: 'identificador_fornecedor' }
}, { sequelize, modelName: 'EnvioWhatsapp', tableName: 'envios_whatsapp' });
