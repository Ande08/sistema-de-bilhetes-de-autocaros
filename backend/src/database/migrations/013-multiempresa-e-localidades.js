export async function up(queryInterface, DataTypes, transaction) {
  await queryInterface.createTable('empresas', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING(160), allowNull: false },
    slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    telefone: { type: DataTypes.STRING(20), allowNull: true },
    activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });

  // A empresa inicial recebe os dados existentes para que a migração não
  // interrompa as viagens, vendas e atendimentos já criados.
  await queryInterface.bulkInsert('empresas', [{
    nome: 'Viagem Bus', slug: 'viagem-bus', activa: true,
    criado_em: new Date(), actualizado_em: new Date()
  }], { transaction });
  const [empresas] = await queryInterface.sequelize.query(
    "SELECT id FROM empresas WHERE slug = 'viagem-bus' LIMIT 1",
    { transaction }
  );
  const empresaInicialId = empresas[0].id;

  await queryInterface.addColumn('utilizadores', 'empresa_id', {
    type: DataTypes.BIGINT.UNSIGNED, allowNull: true,
    references: { model: 'empresas', key: 'id' }, onDelete: 'SET NULL'
  }, { transaction });
  await queryInterface.changeColumn('utilizadores', 'perfil', {
    type: DataTypes.ENUM('PASSAGEIRO', 'GESTOR_SUPORTE', 'EMPRESA_ADMIN', 'ADMIN'),
    allowNull: false, defaultValue: 'PASSAGEIRO'
  }, { transaction });
  await queryInterface.changeColumn('mensagens_suporte', 'autor_tipo', {
    type: DataTypes.ENUM('PASSAGEIRO', 'GESTOR_SUPORTE', 'EMPRESA_ADMIN', 'ADMIN', 'IA', 'SISTEMA'),
    allowNull: false
  }, { transaction });
  await queryInterface.sequelize.query(
    'UPDATE utilizadores SET empresa_id = ? WHERE perfil IN (\'GESTOR_SUPORTE\', \'ADMIN\')',
    { replacements: [empresaInicialId], transaction }
  );

  for (const tabela of ['autocarros', 'rotas', 'viagens', 'tickets_suporte']) {
    await queryInterface.addColumn(tabela, 'empresa_id', {
      type: DataTypes.BIGINT.UNSIGNED, allowNull: true,
      references: { model: 'empresas', key: 'id' }, onDelete: 'RESTRICT'
    }, { transaction });
    await queryInterface.sequelize.query(`UPDATE ${tabela} SET empresa_id = ?`, {
      replacements: [empresaInicialId], transaction
    });
    await queryInterface.changeColumn(tabela, 'empresa_id', {
      type: DataTypes.BIGINT.UNSIGNED, allowNull: false,
      references: { model: 'empresas', key: 'id' }, onDelete: 'RESTRICT'
    }, { transaction });
    await queryInterface.addIndex(tabela, ['empresa_id'], { name: `idx_${tabela}_empresa`, transaction });
  }

  await queryInterface.addColumn('rotas', 'origem_provincia', {
    type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Não definida'
  }, { transaction });
  await queryInterface.addColumn('rotas', 'destino_provincia', {
    type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Não definida'
  }, { transaction });
  const provinciasConhecidas = {
    Maputo: 'Maputo Cidade', Matola: 'Maputo Província', Tete: 'Tete', Beira: 'Sofala',
    Nampula: 'Nampula', 'Xai-Xai': 'Gaza', Chimoio: 'Manica', Quelimane: 'Zambézia',
    Pemba: 'Cabo Delgado', Lichinga: 'Niassa', Inhambane: 'Inhambane', Maxixe: 'Inhambane'
  };
  for (const [cidade, provincia] of Object.entries(provinciasConhecidas)) {
    await queryInterface.sequelize.query(
      'UPDATE rotas SET origem_provincia = ? WHERE origem = ?',
      { replacements: [provincia, cidade], transaction }
    );
    await queryInterface.sequelize.query(
      'UPDATE rotas SET destino_provincia = ? WHERE destino = ?',
      { replacements: [provincia, cidade], transaction }
    );
  }
  await queryInterface.removeIndex('rotas', 'uq_rota_origem_destino', { transaction });
  await queryInterface.addIndex(
    'rotas',
    ['empresa_id', 'origem_provincia', 'origem', 'destino_provincia', 'destino'],
    { unique: true, name: 'uq_rota_empresa_localidades', transaction }
  );
  await queryInterface.addIndex('utilizadores', ['empresa_id', 'perfil', 'activo'], {
    name: 'idx_utilizadores_empresa_perfil', transaction
  });
  await queryInterface.addColumn('verificacoes_otp', 'tipo_conta', {
    type: DataTypes.ENUM('PASSAGEIRO', 'EMPRESA'), allowNull: false, defaultValue: 'PASSAGEIRO'
  }, { transaction });
  await queryInterface.addColumn('verificacoes_otp', 'empresa_nome', {
    type: DataTypes.STRING(160), allowNull: true
  }, { transaction });
}

export async function down(queryInterface, DataTypes, transaction) {
  await queryInterface.removeColumn('verificacoes_otp', 'empresa_nome', { transaction });
  await queryInterface.removeColumn('verificacoes_otp', 'tipo_conta', { transaction });
  await queryInterface.removeIndex('utilizadores', 'idx_utilizadores_empresa_perfil', { transaction });
  await queryInterface.removeIndex('rotas', 'uq_rota_empresa_localidades', { transaction });
  await queryInterface.addIndex('rotas', ['origem', 'destino'], {
    unique: true, name: 'uq_rota_origem_destino', transaction
  });
  await queryInterface.removeColumn('rotas', 'destino_provincia', { transaction });
  await queryInterface.removeColumn('rotas', 'origem_provincia', { transaction });
  for (const tabela of ['tickets_suporte', 'viagens', 'rotas', 'autocarros']) {
    await queryInterface.removeIndex(tabela, `idx_${tabela}_empresa`, { transaction });
    await queryInterface.removeColumn(tabela, 'empresa_id', { transaction });
  }
  await queryInterface.sequelize.query(
    "UPDATE utilizadores SET perfil = 'ADMIN' WHERE perfil = 'EMPRESA_ADMIN'",
    { transaction }
  );
  await queryInterface.sequelize.query(
    "UPDATE mensagens_suporte SET autor_tipo = 'ADMIN' WHERE autor_tipo = 'EMPRESA_ADMIN'",
    { transaction }
  );
  await queryInterface.changeColumn('mensagens_suporte', 'autor_tipo', {
    type: DataTypes.ENUM('PASSAGEIRO', 'GESTOR_SUPORTE', 'ADMIN', 'IA', 'SISTEMA'),
    allowNull: false
  }, { transaction });
  await queryInterface.changeColumn('utilizadores', 'perfil', {
    type: DataTypes.ENUM('PASSAGEIRO', 'GESTOR_SUPORTE', 'ADMIN'),
    allowNull: false, defaultValue: 'PASSAGEIRO'
  }, { transaction });
  await queryInterface.removeColumn('utilizadores', 'empresa_id', { transaction });
  await queryInterface.dropTable('empresas', { transaction });
}
