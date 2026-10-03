export async function up(queryInterface, DataTypes, transaction) {
  // O novo perfil possui acesso exclusivo ao módulo de suporte.
  await queryInterface.changeColumn('utilizadores', 'perfil', {
    type: DataTypes.ENUM('PASSAGEIRO', 'GESTOR_SUPORTE', 'ADMIN'),
    allowNull: false,
    defaultValue: 'PASSAGEIRO'
  }, { transaction });

  await queryInterface.createTable('tickets_suporte', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    codigo: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    utilizador_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'utilizadores', key: 'id' }, onDelete: 'CASCADE' },
    gestor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, references: { model: 'utilizadores', key: 'id' }, onDelete: 'SET NULL' },
    assunto: { type: DataTypes.STRING(160), allowNull: false },
    categoria: { type: DataTypes.ENUM('BILHETE', 'PAGAMENTO', 'VIAGEM', 'CONTA', 'RECLAMACAO', 'OUTRO'), allowNull: false, defaultValue: 'OUTRO' },
    prioridade: { type: DataTypes.ENUM('BAIXA', 'NORMAL', 'ALTA', 'URGENTE'), allowNull: false, defaultValue: 'NORMAL' },
    estado: { type: DataTypes.ENUM('ABERTO', 'EM_ATENDIMENTO', 'AGUARDA_UTILIZADOR', 'RESOLVIDO', 'ENCERRADO'), allowNull: false, defaultValue: 'ABERTO' },
    resolvido_em: { type: DataTypes.DATE, allowNull: true },
    encerrado_em: { type: DataTypes.DATE, allowNull: true },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });
  await queryInterface.addIndex('tickets_suporte', ['utilizador_id', 'estado'], { name: 'idx_suporte_utilizador_estado', transaction });
  await queryInterface.addIndex('tickets_suporte', ['gestor_id', 'estado'], { name: 'idx_suporte_gestor_estado', transaction });

  await queryInterface.createTable('mensagens_suporte', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    ticket_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tickets_suporte', key: 'id' }, onDelete: 'CASCADE' },
    remetente_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, references: { model: 'utilizadores', key: 'id' }, onDelete: 'SET NULL' },
    autor_tipo: { type: DataTypes.ENUM('PASSAGEIRO', 'GESTOR_SUPORTE', 'ADMIN', 'IA', 'SISTEMA'), allowNull: false },
    conteudo: { type: DataTypes.TEXT, allowNull: false },
    lida_em: { type: DataTypes.DATE, allowNull: true },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });
  await queryInterface.addIndex('mensagens_suporte', ['ticket_id', 'criado_em'], { name: 'idx_mensagem_suporte_historico', transaction });
}

export async function down(queryInterface, DataTypes, transaction) {
  await queryInterface.dropTable('mensagens_suporte', { transaction });
  await queryInterface.dropTable('tickets_suporte', { transaction });
  await queryInterface.sequelize.query("UPDATE utilizadores SET perfil = 'PASSAGEIRO' WHERE perfil = 'GESTOR_SUPORTE'", { transaction });
  await queryInterface.changeColumn('utilizadores', 'perfil', {
    type: DataTypes.ENUM('PASSAGEIRO', 'ADMIN'),
    allowNull: false,
    defaultValue: 'PASSAGEIRO'
  }, { transaction });
}
