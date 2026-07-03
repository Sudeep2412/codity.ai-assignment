exports.up = function(knex) {
  return knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('org_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('description');
    table.timestamps(true, true);
    table.unique(['org_id', 'name']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('projects');
};
