export async function up(queryInterface, DataTypes, transaction) {
  await queryInterface.createTable('configuracoes_ia', {
    id: { type: DataTypes.TINYINT.UNSIGNED, primaryKey: true },
    fornecedor: { type: DataTypes.ENUM('OPENROUTER'), allowNull: false, defaultValue: 'OPENROUTER' },
    modelo: { type: DataTypes.STRING(180), allowNull: false, defaultValue: 'deepseek/deepseek-chat' },
    api_key_encriptada: { type: DataTypes.TEXT, allowNull: true },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    actualizado_por: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, references: { model: 'utilizadores', key: 'id' }, onDelete: 'SET NULL' },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });

  const agora = new Date();
  await queryInterface.bulkInsert('configuracoes_ia', [{ id: 1, fornecedor: 'OPENROUTER', modelo: 'deepseek/deepseek-chat', activo: true, criado_em: agora, actualizado_em: agora }], { transaction });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.dropTable('configuracoes_ia', { transaction });
}
