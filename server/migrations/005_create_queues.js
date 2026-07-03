exports.up = function(knex) {
  return knex.schema.createTable('queues', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.string('name').notNullable();
    table.integer('priority').notNullable().defaultTo(5);
    table.integer('concurrency_limit').notNullable().defaultTo(10);
    table.uuid('retry_policy_id').references('id').inTable('retry_policies').onDelete('RESTRICT');
    table.enum('status', ['active', 'paused', 'draining']).defaultTo('active');
    table.jsonb('tags').defaultTo('{}');
    table.bigInteger('total_processed').defaultTo(0);
    table.bigInteger('total_failed').defaultTo(0);
    table.timestamps(true, true);
    table.unique(['project_id', 'name']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('queues');
};
