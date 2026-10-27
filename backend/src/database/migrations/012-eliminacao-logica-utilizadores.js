export async function up(queryInterface, DataTypes, transaction) {
  // A conta é anonimizada e escondida, mas permanece referenciada em bilhetes,
  // pagamentos, suporte e auditoria para preservar a integridade histórica.
  await queryInterface.addColumn('utilizadores', 'eliminado_em', {
    type: DataTypes.DATE,
    allowNull: true
  }, { transaction });
  await queryInterface.addIndex('utilizadores', ['eliminado_em'], {
    name: 'idx_utilizadores_eliminado_em',
    transaction
  });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.removeIndex('utilizadores', 'idx_utilizadores_eliminado_em', { transaction });
  await queryInterface.removeColumn('utilizadores', 'eliminado_em', { transaction });
}
