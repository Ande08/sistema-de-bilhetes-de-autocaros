export async function up(queryInterface, DataTypes, transaction) {
  await queryInterface.addColumn('empresas', 'eliminada_em', {
    type: DataTypes.DATE,
    allowNull: true
  }, { transaction });
  await queryInterface.addIndex('empresas', ['eliminada_em'], {
    name: 'idx_empresas_eliminada_em', transaction
  });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.removeIndex('empresas', 'idx_empresas_eliminada_em', { transaction });
  await queryInterface.removeColumn('empresas', 'eliminada_em', { transaction });
}
