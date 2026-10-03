export async function up(queryInterface, DataTypes, transaction) {
  await queryInterface.createTable('utilizadores', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    perfil: { type: DataTypes.ENUM('PASSAGEIRO', 'ADMIN'), allowNull: false, defaultValue: 'PASSAGEIRO' },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.dropTable('utilizadores', { transaction });
}
