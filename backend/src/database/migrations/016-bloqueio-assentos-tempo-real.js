export async function up(queryInterface, _DataTypes, transaction) {
  // Mantém somente o registo mais recente de cada combinação antes de criar a
  // restrição. Isto permite aplicar a migration também em bases de demonstração.
  await queryInterface.sequelize.query(`
    DELETE antiga FROM reservas antiga
    INNER JOIN reservas recente
      ON antiga.viagem_id = recente.viagem_id
      AND antiga.assento_id = recente.assento_id
      AND antiga.id < recente.id
  `, { transaction });

  // Uma única linha coordena o bloqueio de cada assento em cada viagem. Os
  // estados EXPIRADA/CANCELADA podem ser reutilizados numa seleção posterior.
  await queryInterface.addIndex('reservas', ['viagem_id', 'assento_id'], {
    unique: true,
    name: 'uq_reserva_viagem_assento',
    transaction
  });
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.removeIndex('reservas', 'uq_reserva_viagem_assento', { transaction });
}
