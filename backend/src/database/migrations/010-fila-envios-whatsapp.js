export async function up(queryInterface, DataTypes, transaction) {
  await queryInterface.createTable('envios_whatsapp', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    tipo: { type: DataTypes.ENUM('OTP', 'AVISO_VIAGEM'), allowNull: false },
    utilizador_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, references: { model: 'utilizadores', key: 'id' }, onDelete: 'SET NULL' },
    viagem_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, references: { model: 'viagens', key: 'id' }, onDelete: 'SET NULL' },
    telefone: { type: DataTypes.STRING(20), allowNull: false },
    mensagem: { type: DataTypes.TEXT, allowNull: false },
    chave_idempotencia: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    estado: { type: DataTypes.ENUM('PENDENTE', 'PROCESSANDO', 'ENVIADO', 'FALHADO', 'EXPIRADO'), allowNull: false, defaultValue: 'PENDENTE' },
    prioridade: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 10 },
    tentativas: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    max_tentativas: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 8 },
    proxima_tentativa_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    expira_em: { type: DataTypes.DATE, allowNull: true },
    enviado_em: { type: DataTypes.DATE, allowNull: true },
    ultimo_erro: { type: DataTypes.STRING(500), allowNull: true },
    identificador_fornecedor: { type: DataTypes.STRING(180), allowNull: true },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });
  await queryInterface.addIndex('envios_whatsapp', ['estado', 'proxima_tentativa_em', 'prioridade'], { name: 'idx_whatsapp_fila_processamento', transaction });
  await queryInterface.addIndex('envios_whatsapp', ['viagem_id', 'tipo'], { name: 'idx_whatsapp_viagem_tipo', transaction });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.dropTable('envios_whatsapp', { transaction });
}
