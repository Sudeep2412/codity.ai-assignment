const knex = require('knex');
const env = require('./env');

const db = knex({
  client: 'pg',
  connection: env.NODE_ENV === 'production' ? {
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  } : env.DATABASE_URL,
  pool: { min: 2, max: 10 }
});

module.exports = db;
