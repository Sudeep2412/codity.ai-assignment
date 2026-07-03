const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  // Deletes ALL existing entries in reverse dependency order
  await knex('dead_letter_queue').del();
  await knex('scheduled_jobs').del();
  await knex('job_logs').del();
  await knex('job_executions').del();
  await knex('jobs').del();
  await knex('queues').del();
  await knex('retry_policies').del();
  await knex('projects').del();
  await knex('org_members').del();
  await knex('organizations').del();
  await knex('users').del();
  await knex('worker_heartbeats').del();
  await knex('workers').del();

  const password_hash = await bcrypt.hash('password123', 12);
  const adminId = uuidv4();
  const orgId = uuidv4();
  const projectId = uuidv4();
  const retryPolicyId = uuidv4();

  // 1. Users
  await knex('users').insert([
    { id: adminId, email: 'admin@codity.ai', password_hash, name: 'Admin User', role: 'admin' },
    { id: uuidv4(), email: 'user@codity.ai', password_hash, name: 'Demo User', role: 'member' }
  ]);

  // 2. Organization
  await knex('organizations').insert([
    { id: orgId, name: 'Codity Demo', slug: 'codity-demo' }
  ]);

  // 3. Org Members
  await knex('org_members').insert([
    { org_id: orgId, user_id: adminId, role: 'owner' }
  ]);

  // 4. Projects
  await knex('projects').insert([
    { id: projectId, org_id: orgId, name: 'Default Project', description: 'Primary project for demo' }
  ]);

  // 5. Retry Policies
  await knex('retry_policies').insert([
    { id: retryPolicyId, name: 'Standard Exponential', strategy: 'exponential', max_retries: 5, initial_delay_ms: 1000, backoff_multiplier: 2.0 },
    { id: uuidv4(), name: 'Fast Linear', strategy: 'linear', max_retries: 3, initial_delay_ms: 500, backoff_multiplier: 1.0 },
    { id: uuidv4(), name: 'No Retry', strategy: 'fixed', max_retries: 0, initial_delay_ms: 0, backoff_multiplier: 1.0 }
  ]);

  // 6. Queues
  await knex('queues').insert([
    { id: uuidv4(), project_id: projectId, name: 'emails', priority: 1, concurrency_limit: 10, retry_policy_id: retryPolicyId, tags: JSON.stringify({ type: 'notifications' }) },
    { id: uuidv4(), project_id: projectId, name: 'reports', priority: 5, concurrency_limit: 2, retry_policy_id: retryPolicyId, tags: JSON.stringify({ type: 'heavy' }) },
    { id: uuidv4(), project_id: projectId, name: 'webhooks', priority: 2, concurrency_limit: 20, retry_policy_id: retryPolicyId, tags: JSON.stringify({ type: 'external' }) }
  ]);
};
