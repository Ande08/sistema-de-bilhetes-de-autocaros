export async function up(queryInterface, DataTypes, transaction) {
  await queryInterface.addColumn('mensagens_suporte', 'imagem_url', {
    type: DataTypes.STRING(255), allowNull: true
  }, { transaction });
  await queryInterface.addColumn('mensagens_suporte', 'imagem_nome', {
    type: DataTypes.STRING(180), allowNull: true
  }, { transaction });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.removeColumn('mensagens_suporte', 'imagem_nome', { transaction });
  await queryInterface.removeColumn('mensagens_suporte', 'imagem_url', { transaction });
}
