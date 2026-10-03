export async function up(queryInterface, _DataTypes, transaction) {
  // Bilhetes cancelados permanecem no histórico, mas o assento pode ser revendido.
  await queryInterface.addIndex('bilhetes', ['viagem_id', 'assento_id', 'estado'], { name: 'idx_bilhete_viagem_assento_estado', transaction });
  await queryInterface.addIndex('bilhetes', ['assento_id'], { name: 'idx_bilhete_assento', transaction });
  await queryInterface.removeIndex('bilhetes', 'uq_bilhete_viagem_assento', { transaction });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.addIndex('bilhetes', ['viagem_id', 'assento_id'], { unique: true, name: 'uq_bilhete_viagem_assento', transaction });
  await queryInterface.removeIndex('bilhetes', 'idx_bilhete_viagem_assento_estado', { transaction });
  await queryInterface.removeIndex('bilhetes', 'idx_bilhete_assento', { transaction });
}
