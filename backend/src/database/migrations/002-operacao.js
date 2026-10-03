export async function up(queryInterface, DataTypes, transaction) {
  await queryInterface.createTable('autocarros', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    matricula: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    modelo: { type: DataTypes.STRING(100), allowNull: false },
    capacidade: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });

  await queryInterface.createTable('rotas', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    origem: { type: DataTypes.STRING(100), allowNull: false },
    destino: { type: DataTypes.STRING(100), allowNull: false },
    distancia_km: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });
  await queryInterface.addIndex('rotas', ['origem', 'destino'], { unique: true, name: 'uq_rota_origem_destino', transaction });

  await queryInterface.createTable('viagens', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    rota_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'rotas', key: 'id' } },
    autocarro_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'autocarros', key: 'id' } },
    partida_em: { type: DataTypes.DATE, allowNull: false },
    chegada_prevista_em: { type: DataTypes.DATE, allowNull: true },
    preco: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    estado: { type: DataTypes.ENUM('AGENDADA', 'EM_CURSO', 'CONCLUIDA', 'CANCELADA'), allowNull: false, defaultValue: 'AGENDADA' },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });
  await queryInterface.addIndex('viagens', ['partida_em', 'estado'], { name: 'idx_viagens_partida_estado', transaction });

  await queryInterface.createTable('assentos', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    autocarro_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'autocarros', key: 'id' }, onDelete: 'CASCADE' },
    numero: { type: DataTypes.STRING(10), allowNull: false },
    criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { transaction });
  await queryInterface.addIndex('assentos', ['autocarro_id', 'numero'], { unique: true, name: 'uq_assento_autocarro', transaction });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.dropTable('assentos', { transaction });
  await queryInterface.dropTable('viagens', { transaction });
  await queryInterface.dropTable('rotas', { transaction });
  await queryInterface.dropTable('autocarros', { transaction });
}
