exports.up = function(knex) {
  return knex.schema.createTable('job_executions', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('job_id').references('id').inTable('jobs').onDelete('CASCADE');
    table.uuid('worker_id').references('id').inTable('workers').onDelete('SET NULL');
    table.integer('attempt_number').notNullable();
    table.enum('status', ['running', 'completed', 'failed']).notNullable();
    table.jsonb('result');
    table.text('error_message');
    table.text('stack_trace');
    table.integer('duration_ms');
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('finished_at');

    table.index(['job_id', 'attempt_number'], 'idx_executions_job');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('job_executions');
};
