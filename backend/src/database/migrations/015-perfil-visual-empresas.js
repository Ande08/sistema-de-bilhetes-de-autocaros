export async function up(queryInterface, DataTypes, transaction) {
  await queryInterface.addColumn('empresas', 'logo_url', {
    type: DataTypes.STRING(300), allowNull: true
  }, { transaction });
  await queryInterface.addColumn('empresas', 'descricao', {
    type: DataTypes.STRING(500), allowNull: true
  }, { transaction });
  await queryInterface.addColumn('empresas', 'website', {
    type: DataTypes.STRING(240), allowNull: true
  }, { transaction });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.removeColumn('empresas', 'website', { transaction });
  await queryInterface.removeColumn('empresas', 'descricao', { transaction });
  await queryInterface.removeColumn('empresas', 'logo_url', { transaction });
}
