export async function up(queryInterface, DataTypes, transaction) {
  await queryInterface.createTable('cupoes', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    empresa_id: {
      type: DataTypes.BIGINT.UNSIGNED, allowNull: false,
      references: { model: 'empresas', key: 'id' }, onDelete: 'RESTRICT'
    },
    codigo: { type: DataTypes.STRING(30), allowNull: false },
    descricao: { type: DataTypes.STRING(200), allowNull: true },
    percentagem: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    valido_de: { type: DataTypes.DATE, allowNull: false },
    valido_ate: { type: DataTypes.DATE, allowNull: false },
    valor_minimo: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    limite_utilizacoes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    limite_por_utilizador: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    total_utilizacoes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });

  await queryInterface.addIndex('cupoes', ['empresa_id', 'codigo'], {
    unique: true, name: 'uq_cupao_empresa_codigo', transaction
  });
  await queryInterface.addIndex('cupoes', ['empresa_id', 'activo', 'valido_de', 'valido_ate'], {
    name: 'idx_cupoes_empresa_validade', transaction
  });

  await queryInterface.addColumn('bilhetes', 'cupao_id', {
    type: DataTypes.BIGINT.UNSIGNED, allowNull: true,
    references: { model: 'cupoes', key: 'id' }, onDelete: 'SET NULL'
  }, { transaction });
  await queryInterface.addColumn('bilhetes', 'preco_original', {
    type: DataTypes.DECIMAL(10, 2), allowNull: true
  }, { transaction });
  await queryInterface.addColumn('bilhetes', 'desconto', {
    type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0
  }, { transaction });
  await queryInterface.addIndex('bilhetes', ['cupao_id', 'utilizador_id'], {
    name: 'idx_bilhetes_cupao_utilizador', transaction
  });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.removeIndex('bilhetes', 'idx_bilhetes_cupao_utilizador', { transaction });
  await queryInterface.removeColumn('bilhetes', 'desconto', { transaction });
  await queryInterface.removeColumn('bilhetes', 'preco_original', { transaction });
  await queryInterface.removeColumn('bilhetes', 'cupao_id', { transaction });
  await queryInterface.dropTable('cupoes', { transaction });
}
