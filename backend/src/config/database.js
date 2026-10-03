import { Sequelize } from 'sequelize';

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
    // Opções aplicadas automaticamente a todos os modelos.
    define: {
      underscored: true,
      timestamps: true
    }
  }
);
