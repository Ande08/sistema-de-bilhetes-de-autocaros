export async function up(queryInterface, DataTypes, transaction) {
  await queryInterface.addColumn('empresas', 'estado_cadastro', {
    type: DataTypes.ENUM('PENDENTE', 'APROVADA', 'REJEITADA', 'SUSPENSA'),
    allowNull: false,
    defaultValue: 'APROVADA'
  }, { transaction });
  await queryInterface.addColumn('empresas', 'motivo_estado', {
    type: DataTypes.STRING(500), allowNull: true
  }, { transaction });
  await queryInterface.addColumn('empresas', 'aprovada_em', {
    type: DataTypes.DATE, allowNull: true
  }, { transaction });
  await queryInterface.sequelize.query(
    "UPDATE empresas SET estado_cadastro = CASE WHEN activa = 1 THEN 'APROVADA' ELSE 'SUSPENSA' END, aprovada_em = CASE WHEN activa = 1 THEN actualizado_em ELSE NULL END",
    { transaction }
  );
  // Administradores globais pertencem à plataforma, nunca à empresa inicial
  // criada pela migração de compatibilidade multiempresa.
  await queryInterface.sequelize.query(
    "UPDATE utilizadores SET empresa_id = NULL WHERE perfil = 'ADMIN'",
    { transaction }
  );
  await queryInterface.addIndex('empresas', ['estado_cadastro', 'eliminada_em'], {
    name: 'idx_empresas_estado_cadastro', transaction
  });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.removeIndex('empresas', 'idx_empresas_estado_cadastro', { transaction });
  await queryInterface.removeColumn('empresas', 'aprovada_em', { transaction });
  await queryInterface.removeColumn('empresas', 'motivo_estado', { transaction });
  await queryInterface.removeColumn('empresas', 'estado_cadastro', { transaction });
}
