import { Sequelize } from 'sequelize';

/**
 * Converte limites configuráveis para inteiros dentro de uma faixa segura.
 * Valores inválidos nunca podem ampliar silenciosamente o consumo do MySQL.
 */
export function numeroLimitado(valor, padrao, minimo, maximo) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return padrao;
  return Math.max(minimo, Math.min(maximo, Math.floor(numero)));
}

export function obterLimitesBaseDados(ambiente = process.env) {
  return {
    maxPreparedStatements: numeroLimitado(
      ambiente.DB_MAX_PREPARED_STATEMENTS_PER_CONNECTION,
      250,
      50,
      2000
    ),
    pool: {
      max: numeroLimitado(ambiente.DB_POOL_MAX, 5, 1, 20),
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };
}

const limites = obterLimitesBaseDados();

// Instância única do Sequelize utilizada por todos os modelos e serviços.
// A centralização evita criar ligações diferentes para cada operação.
export const sequelize = new Sequelize(
  process.env.DB_NAME || 'sistema_bilhetes',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    // O mysql2 conserva prepared statements numa cache por ligação. Limitar a
    // cache e o pool impede este serviço de esgotar o limite global do MySQL.
    dialectOptions: {
      maxPreparedStatements: limites.maxPreparedStatements
    },
    pool: limites.pool,
    // Opções aplicadas automaticamente a todos os modelos.
    define: {
      underscored: true,
      timestamps: true,
      createdAt: 'criado_em',
      updatedAt: 'actualizado_em'
    }
  }
);
