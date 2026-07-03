exports.up = function(knex) {
  return knex.schema.createTable('dead_letter_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('original_job_id').references('id').inTable('jobs').onDelete('SET NULL');
    table.uuid('queue_id').references('id').inTable('queues').onDelete('CASCADE');
    table.string('job_type').notNullable();
    table.jsonb('payload').defaultTo('{}');
    table.text('failure_reason');
    table.text('ai_failure_summary');
    table.integer('total_attempts').notNullable();
    table.jsonb('execution_history');
    table.enum('resolution_status', ['pending', 'retried', 'discarded']).defaultTo('pending');
    table.timestamp('failed_at').defaultTo(knex.fn.now());
    table.timestamp('resolved_at');
    
    // DLQ browsing index
    table.index(['resolution_status', 'failed_at'], 'idx_dlq_resolution');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('dead_letter_queue');
};
