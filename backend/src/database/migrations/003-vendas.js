export async function up(queryInterface, DataTypes, transaction) {
  await queryInterface.createTable('reservas', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    utilizador_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'utilizadores', key: 'id' } },
    viagem_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'viagens', key: 'id' } },
    assento_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'assentos', key: 'id' } },
    estado: { type: DataTypes.ENUM('PENDENTE', 'CONFIRMADA', 'EXPIRADA', 'CANCELADA'), allowNull: false, defaultValue: 'PENDENTE' },
    expira_em: { type: DataTypes.DATE, allowNull: false },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });
  await queryInterface.addIndex('reservas', ['viagem_id', 'assento_id', 'estado'], { name: 'idx_reserva_assento_estado', transaction });

  await queryInterface.createTable('bilhetes', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    codigo: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    utilizador_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, references: { model: 'utilizadores', key: 'id' } },
    viagem_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'viagens', key: 'id' } },
    assento_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'assentos', key: 'id' } },
    nome_passageiro: { type: DataTypes.STRING(120), allowNull: false },
    preco: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    estado: { type: DataTypes.ENUM('RESERVADO', 'EMITIDO', 'CANCELADO', 'UTILIZADO'), allowNull: false, defaultValue: 'RESERVADO' },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });
  await queryInterface.addIndex('bilhetes', ['viagem_id', 'assento_id'], { unique: true, name: 'uq_bilhete_viagem_assento', transaction });

  await queryInterface.createTable('pagamentos', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    bilhete_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true, references: { model: 'bilhetes', key: 'id' } },
    metodo: { type: DataTypes.ENUM('MPESA', 'EMOLA', 'CARTAO'), allowNull: false },
    referencia: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    estado: { type: DataTypes.ENUM('PENDENTE', 'APROVADO', 'REJEITADO', 'REEMBOLSADO'), allowNull: false, defaultValue: 'PENDENTE' },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });

  await queryInterface.createTable('notificacoes', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    utilizador_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'utilizadores', key: 'id' }, onDelete: 'CASCADE' },
    titulo: { type: DataTypes.STRING(140), allowNull: false },
    mensagem: { type: DataTypes.TEXT, allowNull: false },
    tipo: { type: DataTypes.STRING(40), allowNull: false },
    lida_em: { type: DataTypes.DATE, allowNull: true },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });

  await queryInterface.createTable('auditorias', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    utilizador_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, references: { model: 'utilizadores', key: 'id' }, onDelete: 'SET NULL' },
    operacao: { type: DataTypes.STRING(80), allowNull: false },
    entidade: { type: DataTypes.STRING(80), allowNull: false },
    entidade_id: { type: DataTypes.STRING(80), allowNull: true },
    valores_anteriores: { type: DataTypes.JSON, allowNull: true },
    valores_novos: { type: DataTypes.JSON, allowNull: true },
    endereco_ip: { type: DataTypes.STRING(64), allowNull: true },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.dropTable('auditorias', { transaction });
  await queryInterface.dropTable('notificacoes', { transaction });
  await queryInterface.dropTable('pagamentos', { transaction });
  await queryInterface.dropTable('bilhetes', { transaction });
  await queryInterface.dropTable('reservas', { transaction });
}
