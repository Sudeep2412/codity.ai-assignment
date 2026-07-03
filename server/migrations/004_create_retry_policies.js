exports.up = function(knex) {
  return knex.schema.createTable('retry_policies', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('name').unique().notNullable();
    table.enum('strategy', ['fixed', 'linear', 'exponential']).notNullable();
    table.integer('max_retries').notNullable().defaultTo(3);
    table.integer('initial_delay_ms').notNullable().defaultTo(1000);
    table.float('backoff_multiplier').defaultTo(2.0);
    table.integer('max_delay_ms').defaultTo(3600000);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('retry_policies');
};
