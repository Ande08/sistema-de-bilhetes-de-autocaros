export async function up(queryInterface, DataTypes, transaction) {
  // Conserva a origem de cada ocorrência para apresentar a frequência no painel.
  await queryInterface.addColumn('viagens', 'tipo_recorrencia', {
    type: DataTypes.ENUM('UNICA', 'DIARIA', 'SEMANAL'), allowNull: false, defaultValue: 'UNICA'
  }, { transaction });
  await queryInterface.addColumn('viagens', 'grupo_recorrencia', {
    type: DataTypes.STRING(36), allowNull: true
  }, { transaction });
  await queryInterface.addColumn('viagens', 'dias_recorrencia', {
    type: DataTypes.STRING(32), allowNull: true
  }, { transaction });
  await queryInterface.addColumn('viagens', 'recorrencia_inicio', {
    type: DataTypes.DATEONLY, allowNull: true
  }, { transaction });
  await queryInterface.addColumn('viagens', 'recorrencia_fim', {
    type: DataTypes.DATEONLY, allowNull: true
  }, { transaction });
  await queryInterface.addIndex('viagens', ['grupo_recorrencia'], {
    name: 'idx_viagens_grupo_recorrencia', transaction
  });

  // O mesmo mecanismo OTP passa a autorizar nome, apelido e telefone.
  await queryInterface.changeColumn('verificacoes_otp', 'finalidade', {
    type: DataTypes.ENUM('CRIAR_CONTA', 'RECUPERAR_PALAVRA_PASSE', 'ALTERAR_PALAVRA_PASSE', 'ALTERAR_DADOS_PESSOAIS'),
    allowNull: false, defaultValue: 'CRIAR_CONTA'
  }, { transaction });
  await queryInterface.addColumn('verificacoes_otp', 'novo_telefone', {
    type: DataTypes.STRING(20), allowNull: true
  }, { transaction });

  // O bilhete determina a empresa do atendimento; a prioridade é calculada pelo sistema.
  await queryInterface.addColumn('tickets_suporte', 'bilhete_id', {
    type: DataTypes.BIGINT.UNSIGNED, allowNull: true,
    references: { model: 'bilhetes', key: 'id' }, onDelete: 'SET NULL'
  }, { transaction });
  await queryInterface.addColumn('tickets_suporte', 'prioridade_pontuacao', {
    type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 50
  }, { transaction });
  await queryInterface.addColumn('tickets_suporte', 'prioridade_motivo', {
    type: DataTypes.STRING(255), allowNull: true
  }, { transaction });
  await queryInterface.addIndex('tickets_suporte', ['bilhete_id'], {
    name: 'idx_tickets_suporte_bilhete', transaction
  });

  await queryInterface.createTable('avaliacoes_empresas', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    empresa_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'empresas', key: 'id' }, onDelete: 'CASCADE' },
    utilizador_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'utilizadores', key: 'id' }, onDelete: 'CASCADE' },
    classificacao: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    comentario: { type: DataTypes.STRING(600), allowNull: true },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });
  await queryInterface.addIndex('avaliacoes_empresas', ['empresa_id', 'utilizador_id'], {
    unique: true, name: 'uq_avaliacao_empresa_utilizador', transaction
  });
}

export async function down(queryInterface, DataTypes, transaction) {
  await queryInterface.dropTable('avaliacoes_empresas', { transaction });
  await queryInterface.removeIndex('tickets_suporte', 'idx_tickets_suporte_bilhete', { transaction });
  await queryInterface.removeColumn('tickets_suporte', 'prioridade_motivo', { transaction });
  await queryInterface.removeColumn('tickets_suporte', 'prioridade_pontuacao', { transaction });
  await queryInterface.removeColumn('tickets_suporte', 'bilhete_id', { transaction });
  await queryInterface.removeColumn('verificacoes_otp', 'novo_telefone', { transaction });
  await queryInterface.changeColumn('verificacoes_otp', 'finalidade', {
    type: DataTypes.ENUM('CRIAR_CONTA', 'RECUPERAR_PALAVRA_PASSE', 'ALTERAR_PALAVRA_PASSE'),
    allowNull: false, defaultValue: 'CRIAR_CONTA'
  }, { transaction });
  await queryInterface.removeIndex('viagens', 'idx_viagens_grupo_recorrencia', { transaction });
  await queryInterface.removeColumn('viagens', 'recorrencia_fim', { transaction });
  await queryInterface.removeColumn('viagens', 'recorrencia_inicio', { transaction });
  await queryInterface.removeColumn('viagens', 'dias_recorrencia', { transaction });
  await queryInterface.removeColumn('viagens', 'grupo_recorrencia', { transaction });
  await queryInterface.removeColumn('viagens', 'tipo_recorrencia', { transaction });
}
