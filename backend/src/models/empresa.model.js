import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Empresa extends Model {}

Empresa.init({
  nome: { type: DataTypes.STRING(160), allowNull: false },
  slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  telefone: { type: DataTypes.STRING(20), allowNull: true },
  logoUrl: { type: DataTypes.STRING(300), allowNull: true, field: 'logo_url' },
  descricao: { type: DataTypes.STRING(500), allowNull: true },
  website: { type: DataTypes.STRING(240), allowNull: true },
  activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  estadoCadastro: { type: DataTypes.ENUM('PENDENTE', 'APROVADA', 'REJEITADA', 'SUSPENSA'), allowNull: false, defaultValue: 'APROVADA', field: 'estado_cadastro' },
  motivoEstado: { type: DataTypes.STRING(500), allowNull: true, field: 'motivo_estado' },
  aprovadaEm: { type: DataTypes.DATE, allowNull: true, field: 'aprovada_em' },
  eliminadaEm: { type: DataTypes.DATE, allowNull: true, field: 'eliminada_em' }
}, { sequelize, modelName: 'Empresa', tableName: 'empresas' });
