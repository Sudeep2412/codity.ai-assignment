exports.up = function(knex) {
  return knex.schema
    // Add timeout_ms to jobs
    .alterTable('jobs', (table) => {
      table.integer('timeout_ms').defaultTo(30000);
    })
    // Add missing indexes for performance
    .raw('CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_worker ON worker_heartbeats (worker_id, timestamp DESC)')
    .raw('CREATE INDEX IF NOT EXISTS idx_job_logs_job ON job_logs (job_id, timestamp ASC)')
    .raw('CREATE INDEX IF NOT EXISTS idx_jobs_worker_status ON jobs (claimed_by_worker, status)');
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('jobs', (table) => {
      table.dropColumn('timeout_ms');
    })
    .raw('DROP INDEX IF EXISTS idx_worker_heartbeats_worker')
    .raw('DROP INDEX IF EXISTS idx_job_logs_job')
    .raw('DROP INDEX IF EXISTS idx_jobs_worker_status');
};
