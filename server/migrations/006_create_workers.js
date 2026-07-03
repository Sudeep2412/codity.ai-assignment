exports.up = function(knex) {
  return knex.schema.createTable('workers', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('hostname').notNullable();
    table.enum('status', ['online', 'busy', 'idle', 'offline']).defaultTo('online');
    table.integer('concurrency_slots').notNullable().defaultTo(10);
    table.integer('active_jobs').defaultTo(0);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('registered_at').defaultTo(knex.fn.now());
    table.timestamp('last_heartbeat_at').defaultTo(knex.fn.now());
    
    // Worker heartbeat timeout detection index
    table.index(['last_heartbeat_at'], 'idx_workers_heartbeat', {
      indexType: 'btree'
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('workers');
};
