export async function up(queryInterface, DataTypes, transaction) {
  // Substitui o slug gratuito retirado pela OpenRouter e corrige o padrão da coluna.
  await queryInterface.sequelize.query(
    "UPDATE configuracoes_ia SET modelo = 'deepseek/deepseek-chat' WHERE modelo = 'deepseek/deepseek-chat:free'",
    { transaction }
  );
  await queryInterface.changeColumn('configuracoes_ia', 'modelo', {
    type: DataTypes.STRING(180), allowNull: false, defaultValue: 'deepseek/deepseek-chat'
  }, { transaction });
}

export async function down(queryInterface, DataTypes, transaction) {
  await queryInterface.sequelize.query(
    "UPDATE configuracoes_ia SET modelo = 'deepseek/deepseek-chat:free' WHERE modelo = 'deepseek/deepseek-chat'",
    { transaction }
  );
  await queryInterface.changeColumn('configuracoes_ia', 'modelo', {
    type: DataTypes.STRING(180), allowNull: false, defaultValue: 'deepseek/deepseek-chat:free'
  }, { transaction });
}
