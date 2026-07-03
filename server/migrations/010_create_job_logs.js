exports.up = function(knex) {
  return knex.schema.createTable('job_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('job_id').references('id').inTable('jobs').onDelete('CASCADE');
    table.uuid('execution_id').references('id').inTable('job_executions').onDelete('CASCADE');
    table.enum('level', ['info', 'warn', 'error', 'debug']).defaultTo('info');
    table.text('message').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('job_logs');
};
