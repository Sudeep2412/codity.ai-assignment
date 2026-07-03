exports.up = async function(knex) {
  // D1: Fix partial index for claimable jobs
  await knex.raw('DROP INDEX IF EXISTS idx_jobs_claimable;');
  await knex.raw("CREATE INDEX idx_jobs_claimable ON jobs (queue_id, priority, created_at) WHERE status = 'queued';");

  // D2: Fix idempotency partial unique index 
  // Knex created this as a unique constraint named idx_jobs_idempotency
  await knex.raw('ALTER TABLE jobs DROP CONSTRAINT IF EXISTS idx_jobs_idempotency;');
  await knex.raw('DROP INDEX IF EXISTS idx_jobs_idempotency;');
  await knex.raw('CREATE UNIQUE INDEX idx_jobs_idempotency ON jobs (queue_id, idempotency_key) WHERE idempotency_key IS NOT NULL;');

  // D3: Index on scheduled_at for the worker claim query
  await knex.raw("CREATE INDEX idx_jobs_scheduled_at ON jobs (scheduled_at) WHERE status = 'queued';");

  // D5: Index on scheduled_jobs to optimize the scheduler poller
  await knex.raw("CREATE INDEX idx_scheduled_enabled ON scheduled_jobs (enabled, next_run_at) WHERE enabled = true;");

  // D6: Add updated_at to organizations table
  await knex.schema.alterTable('organizations', table => {
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // D8: Add database-level check constraints
  await knex.raw('ALTER TABLE jobs ADD CONSTRAINT check_priority CHECK (priority BETWEEN 1 AND 10);');
  await knex.raw('ALTER TABLE queues ADD CONSTRAINT check_concurrency CHECK (concurrency_limit > 0);');
};

exports.down = async function(knex) {
  await knex.raw('ALTER TABLE jobs DROP CONSTRAINT IF EXISTS check_priority;');
  await knex.raw('ALTER TABLE queues DROP CONSTRAINT IF EXISTS check_concurrency;');

  await knex.schema.alterTable('organizations', table => {
    table.dropColumn('updated_at');
  });

  await knex.raw('DROP INDEX IF EXISTS idx_scheduled_enabled;');
  await knex.raw('DROP INDEX IF EXISTS idx_jobs_scheduled_at;');
  
  await knex.raw('DROP INDEX IF EXISTS idx_jobs_idempotency;');
  await knex.schema.alterTable('jobs', table => {
    table.unique(['queue_id', 'idempotency_key'], 'idx_jobs_idempotency');
  });

  await knex.raw('DROP INDEX IF EXISTS idx_jobs_claimable;');
  await knex.schema.alterTable('jobs', table => {
    table.index(['queue_id', 'priority', 'created_at'], 'idx_jobs_claimable', { indexType: 'btree' });
  });
};
