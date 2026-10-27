export async function up(queryInterface, DataTypes, transaction) {
  // A recuperação guarda apenas o código OTP. Os dados pessoais e a nova
  // palavra-passe só são consultados depois de o código ser confirmado.
  await queryInterface.changeColumn('verificacoes_otp', 'finalidade', {
    type: DataTypes.ENUM('CRIAR_CONTA', 'RECUPERAR_PALAVRA_PASSE'),
    allowNull: false,
    defaultValue: 'CRIAR_CONTA'
  }, { transaction });
  await queryInterface.changeColumn('verificacoes_otp', 'nome', {
    type: DataTypes.STRING(80), allowNull: true
  }, { transaction });
  await queryInterface.changeColumn('verificacoes_otp', 'apelido', {
    type: DataTypes.STRING(120), allowNull: true
  }, { transaction });
  await queryInterface.changeColumn('verificacoes_otp', 'password_hash', {
    type: DataTypes.STRING(255), allowNull: true
  }, { transaction });
}

export async function down(queryInterface, DataTypes, transaction) {
  // Elimina apenas pedidos de recuperação antes de restaurar as restrições
  // antigas, preservando os pedidos pendentes de criação de conta.
  await queryInterface.bulkDelete('verificacoes_otp', {
    finalidade: 'RECUPERAR_PALAVRA_PASSE'
  }, { transaction });
  await queryInterface.changeColumn('verificacoes_otp', 'nome', {
    type: DataTypes.STRING(80), allowNull: false
  }, { transaction });
  await queryInterface.changeColumn('verificacoes_otp', 'apelido', {
    type: DataTypes.STRING(120), allowNull: false
  }, { transaction });
  await queryInterface.changeColumn('verificacoes_otp', 'password_hash', {
    type: DataTypes.STRING(255), allowNull: false
  }, { transaction });
  await queryInterface.changeColumn('verificacoes_otp', 'finalidade', {
    type: DataTypes.ENUM('CRIAR_CONTA'), allowNull: false, defaultValue: 'CRIAR_CONTA'
  }, { transaction });
}
