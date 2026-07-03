exports.up = function(knex) {
  return knex.schema
    .createTable('organizations', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.string('name').unique().notNullable();
      table.string('slug').unique().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('org_members', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('org_id').references('id').inTable('organizations').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.enum('role', ['owner', 'admin', 'member']).defaultTo('member');
      table.timestamp('joined_at').defaultTo(knex.fn.now());
      table.unique(['org_id', 'user_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('org_members')
    .dropTableIfExists('organizations');
};
