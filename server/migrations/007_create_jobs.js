exports.up = function(knex) {
  return knex.schema.createTable('jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('queue_id').references('id').inTable('queues').onDelete('CASCADE');
    table.string('type').notNullable();
    table.enum('status', ['queued', 'scheduled', 'claimed', 'running', 'completed', 'failed', 'cancelled']).defaultTo('queued');
    table.integer('priority').defaultTo(5);
    table.jsonb('payload').defaultTo('{}');
    table.jsonb('result');
    table.integer('attempt_number').defaultTo(0);
    table.integer('max_attempts').defaultTo(3);
    table.uuid('claimed_by_worker').references('id').inTable('workers').onDelete('SET NULL');
    table.string('idempotency_key');
    table.timestamp('scheduled_at').defaultTo(knex.fn.now());
    table.timestamp('claimed_at');
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.timestamps(true, true);
    
    // Partial indexes based on the implementation plan
    table.index(['queue_id', 'priority', 'created_at'], 'idx_jobs_claimable', {
      indexType: 'btree'
    });
    table.index(['status', 'queue_id'], 'idx_jobs_status');
    table.unique(['queue_id', 'idempotency_key'], 'idx_jobs_idempotency', {
      predicate: knex.whereNotNull('idempotency_key')
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('jobs');
};
