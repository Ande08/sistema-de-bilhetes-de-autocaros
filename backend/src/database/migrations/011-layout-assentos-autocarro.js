export async function up(queryInterface, DataTypes, transaction) {
  // A distribuição do autocarro permite reconstruir o corredor e as janelas
  // tanto no mapa 3D como no mapa leve usado em dispositivos limitados.
  await queryInterface.addColumn('autocarros', 'lugares_esquerda', {
    type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 2
  }, { transaction });
  await queryInterface.addColumn('autocarros', 'lugares_direita', {
    type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 2
  }, { transaction });

  await queryInterface.addColumn('assentos', 'fila', {
    type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1
  }, { transaction });
  await queryInterface.addColumn('assentos', 'coluna', {
    type: DataTypes.STRING(2), allowNull: false, defaultValue: 'A'
  }, { transaction });
  await queryInterface.addColumn('assentos', 'lado', {
    type: DataTypes.STRING(10), allowNull: false, defaultValue: 'ESQUERDO'
  }, { transaction });
  await queryInterface.addColumn('assentos', 'junto_janela', {
    type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false
  }, { transaction });

  // Os autocarros já existentes recebem a disposição convencional 2+2.
  const [assentos] = await queryInterface.sequelize.query(
    'SELECT id, autocarro_id, numero FROM assentos ORDER BY autocarro_id, CAST(numero AS UNSIGNED), numero',
    { transaction }
  );
  const contagemPorAutocarro = new Map();
  for (const assento of assentos) {
    const indice = contagemPorAutocarro.get(assento.autocarro_id) || 0;
    const posicao = indice % 4;
    await queryInterface.bulkUpdate('assentos', {
      fila: Math.floor(indice / 4) + 1,
      coluna: String.fromCharCode(65 + posicao),
      lado: posicao < 2 ? 'ESQUERDO' : 'DIREITO',
      junto_janela: posicao === 0 || posicao === 3
    }, { id: assento.id }, { transaction });
    contagemPorAutocarro.set(assento.autocarro_id, indice + 1);
  }
}

export async function down(queryInterface, _DataTypes, transaction) {
  await queryInterface.removeColumn('assentos', 'junto_janela', { transaction });
  await queryInterface.removeColumn('assentos', 'lado', { transaction });
  await queryInterface.removeColumn('assentos', 'coluna', { transaction });
  await queryInterface.removeColumn('assentos', 'fila', { transaction });
  await queryInterface.removeColumn('autocarros', 'lugares_direita', { transaction });
  await queryInterface.removeColumn('autocarros', 'lugares_esquerda', { transaction });
}
