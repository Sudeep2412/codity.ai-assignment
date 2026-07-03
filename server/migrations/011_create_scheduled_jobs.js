exports.up = function(knex) {
  return knex.schema.createTable('scheduled_jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('queue_id').references('id').inTable('queues').onDelete('CASCADE');
    table.string('type').notNullable();
    table.string('cron_expression').notNullable();
    table.jsonb('payload').defaultTo('{}');
    table.boolean('enabled').defaultTo(true);
    table.uuid('last_job_id').references('id').inTable('jobs').onDelete('SET NULL');
    table.timestamp('next_run_at').notNullable();
    table.timestamp('last_run_at');
    table.timestamps(true, true);
    
    // Scheduled job promotion index
    table.index(['next_run_at'], 'idx_scheduled_next_run', {
      indexType: 'btree'
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('scheduled_jobs');
};
