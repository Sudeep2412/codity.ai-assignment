exports.up = function(knex) {
  return knex.schema.createTable('worker_heartbeats', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('worker_id').references('id').inTable('workers').onDelete('CASCADE');
    table.integer('active_jobs').notNullable();
    table.float('cpu_usage').notNullable();
    table.float('memory_usage').notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('worker_heartbeats');
};
