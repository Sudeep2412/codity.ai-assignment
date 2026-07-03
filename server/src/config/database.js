const knex = require('knex');
const knexfile = require('../../knexfile');
const env = require('./env');
const logger = require('../utils/logger');

const db = knex(knexfile[env.NODE_ENV || 'development']);

// Simple liveness check
db.raw('SELECT 1')
  .then(() => {
    logger.info('Database connected successfully.');
  })
  .catch((err) => {
    logger.error('Database connection failed', err);
  });

module.exports = db;
