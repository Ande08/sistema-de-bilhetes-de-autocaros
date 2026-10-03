export async function up(queryInterface, _DataTypes, transaction) {
  // Bilhetes cancelados permanecem no histórico, mas o assento pode ser revendido.
  await queryInterface.removeIndex('bilhetes', 'uq_bilhete_viagem_assento', { transaction });
  await queryInterface.addIndex('bilhetes', ['viagem_id', 'assento_id', 'estado'], { name: 'idx_bilhete_viagem_assento_estado', transaction });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.removeIndex('bilhetes', 'idx_bilhete_viagem_assento_estado', { transaction });
  await queryInterface.addIndex('bilhetes', ['viagem_id', 'assento_id'], { unique: true, name: 'uq_bilhete_viagem_assento', transaction });
}
