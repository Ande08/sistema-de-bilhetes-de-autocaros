export async function up(queryInterface, DataTypes, transaction) {
  await queryInterface.addColumn('utilizadores', 'apelido', { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'Utilizador' }, { transaction });
  await queryInterface.addColumn('utilizadores', 'telefone', { type: DataTypes.STRING(20), allowNull: true }, { transaction });

  // Mantém as contas locais conhecidas acessíveis depois da mudança de identificador.
  await queryInterface.sequelize.query("UPDATE utilizadores SET telefone = '+258840000001' WHERE email = 'admin@viagembus.test'", { transaction });
  await queryInterface.sequelize.query("UPDATE utilizadores SET telefone = '+258840000002' WHERE email = 'passageiro@viagembus.test'", { transaction });
  await queryInterface.sequelize.query("UPDATE utilizadores SET telefone = '+258840000003' WHERE email = 'suporte@viagembus.test'", { transaction });
  await queryInterface.sequelize.query("UPDATE utilizadores SET telefone = CONCAT('+25889', LPAD(id, 7, '0')) WHERE telefone IS NULL", { transaction });
  await queryInterface.sequelize.query("UPDATE utilizadores SET apelido = TRIM(SUBSTRING(nome, LOCATE(' ', nome) + 1)), nome = SUBSTRING_INDEX(nome, ' ', 1) WHERE LOCATE(' ', nome) > 0", { transaction });
  await queryInterface.changeColumn('utilizadores', 'nome', { type: DataTypes.STRING(80), allowNull: false }, { transaction });
  await queryInterface.changeColumn('utilizadores', 'telefone', { type: DataTypes.STRING(20), allowNull: false, unique: true }, { transaction });
  await queryInterface.changeColumn('utilizadores', 'email', { type: DataTypes.STRING(180), allowNull: true, unique: true }, { transaction });

  await queryInterface.createTable('verificacoes_otp', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    telefone: { type: DataTypes.STRING(20), allowNull: false },
    finalidade: { type: DataTypes.ENUM('CRIAR_CONTA'), allowNull: false, defaultValue: 'CRIAR_CONTA' },
    canal: { type: DataTypes.ENUM('WHATSAPP', 'SMS'), allowNull: false },
    codigo_hash: { type: DataTypes.STRING(255), allowNull: false },
    nome: { type: DataTypes.STRING(80), allowNull: false },
    apelido: { type: DataTypes.STRING(120), allowNull: false },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    tentativas: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    expira_em: { type: DataTypes.DATE, allowNull: false },
    consumido_em: { type: DataTypes.DATE, allowNull: true },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });
  await queryInterface.addIndex('verificacoes_otp', ['telefone', 'finalidade', 'consumido_em'], { name: 'idx_otp_telefone_finalidade', transaction });
}

export async function down(queryInterface, DataTypes, transaction) {
  await queryInterface.dropTable('verificacoes_otp', { transaction });
  await queryInterface.sequelize.query("UPDATE utilizadores SET email = CONCAT('utilizador-', id, '@migracao.local') WHERE email IS NULL", { transaction });
  await queryInterface.sequelize.query("UPDATE utilizadores SET nome = TRIM(CONCAT(nome, ' ', apelido))", { transaction });
  await queryInterface.changeColumn('utilizadores', 'nome', { type: DataTypes.STRING(120), allowNull: false }, { transaction });
  await queryInterface.changeColumn('utilizadores', 'email', { type: DataTypes.STRING(180), allowNull: false, unique: true }, { transaction });
  await queryInterface.removeColumn('utilizadores', 'telefone', { transaction });
  await queryInterface.removeColumn('utilizadores', 'apelido', { transaction });
}
