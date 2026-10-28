export async function up(queryInterface, DataTypes, transaction) {
  // Mantém os códigos de alteração autenticada separados dos códigos de
  // recuperação pública, impedindo a reutilização entre fluxos diferentes.
  await queryInterface.changeColumn('verificacoes_otp', 'finalidade', {
    type: DataTypes.ENUM('CRIAR_CONTA', 'RECUPERAR_PALAVRA_PASSE', 'ALTERAR_PALAVRA_PASSE'),
    allowNull: false,
    defaultValue: 'CRIAR_CONTA'
  }, { transaction });
}

export async function down(queryInterface, DataTypes, transaction) {
  await queryInterface.bulkDelete('verificacoes_otp', {
    finalidade: 'ALTERAR_PALAVRA_PASSE'
  }, { transaction });
  await queryInterface.changeColumn('verificacoes_otp', 'finalidade', {
    type: DataTypes.ENUM('CRIAR_CONTA', 'RECUPERAR_PALAVRA_PASSE'),
    allowNull: false,
    defaultValue: 'CRIAR_CONTA'
  }, { transaction });
}
