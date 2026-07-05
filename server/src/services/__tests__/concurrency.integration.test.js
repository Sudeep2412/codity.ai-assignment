/**
 * Integration Tests: Atomic Job Claiming & Stale Worker Recovery
 * 
 * These tests verify the two most critical distributed-systems properties:
 * 1. No job is ever double-claimed by concurrent workers (atomicity via SKIP LOCKED)
 * 2. Orphaned jobs from crashed workers are recovered (stale heartbeat detection)
 * 
 * Uses the real PostgreSQL database to test actual SQL-level guarantees.
 */

require('dotenv').config({ path: '../.env' });
const knex = require('knex');
const knexfile = require('../../../knexfile');

const { v4: uuidv4 } = require('uuid');

let db;
let testQueueId;
let testProjectId;
const TEST_WORKER_IDS = [uuidv4(), uuidv4(), uuidv4()];

beforeAll(async () => {
  // Jest sets NODE_ENV=test, but knexfile only has development/production
  const env = knexfile[process.env.NODE_ENV] ? process.env.NODE_ENV : 'development';
  db = knex(knexfile[env]);

  // Clean up any leftover test data
  await db('dead_letter_queue').whereIn('queue_id', db('queues').select('id').where('name', 'like', 'test-atomic-%')).del();
  await db('job_logs').whereIn('job_id', db('jobs').select('id').whereIn('queue_id', db('queues').select('id').where('name', 'like', 'test-atomic-%'))).del();
  await db('job_executions').whereIn('job_id', db('jobs').select('id').whereIn('queue_id', db('queues').select('id').where('name', 'like', 'test-atomic-%'))).del();
  await db('jobs').whereIn('queue_id', db('queues').select('id').where('name', 'like', 'test-atomic-%')).del();
  await db('workers').whereIn('id', TEST_WORKER_IDS).del();
  await db('queues').where('name', 'like', 'test-atomic-%').del();

  // Get a project to attach queues to
  const project = await db('projects').first();
  if (!project) {
    throw new Error('No project found — run seed first: npm run seed');
  }
  testProjectId = project.id;
});

afterAll(async () => {
  // Clean up test data
  await db('dead_letter_queue').whereIn('queue_id', db('queues').select('id').where('name', 'like', 'test-atomic-%')).del();
  await db('job_logs').whereIn('job_id', db('jobs').select('id').whereIn('queue_id', db('queues').select('id').where('name', 'like', 'test-atomic-%'))).del();
  await db('job_executions').whereIn('job_id', db('jobs').select('id').whereIn('queue_id', db('queues').select('id').where('name', 'like', 'test-atomic-%'))).del();
  await db('jobs').whereIn('queue_id', db('queues').select('id').where('name', 'like', 'test-atomic-%')).del();
  await db('workers').whereIn('id', TEST_WORKER_IDS).del();
  await db('queues').where('name', 'like', 'test-atomic-%').del();
  await db.destroy();
});

/**
 * Helper: simulate one worker's atomic claim query — identical to worker/src/poller.js
 */
async function simulateWorkerClaim(workerId) {
  const result = await db.raw(`
    UPDATE jobs
    SET
        status = 'claimed',
        claimed_by_worker = ?,
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = (
        SELECT j.id FROM jobs j
        INNER JOIN queues q ON q.id = j.queue_id
        WHERE j.status = 'queued'
          AND j.scheduled_at <= NOW()
          AND q.status = 'active'
          AND (
            SELECT COUNT(*) FROM jobs running
            WHERE running.queue_id = q.id
              AND running.status IN ('claimed', 'running')
          ) < q.concurrency_limit
        ORDER BY q.priority ASC, j.priority ASC, j.created_at ASC
        LIMIT 1
        FOR UPDATE OF j SKIP LOCKED
    )
    RETURNING *;
  `, [workerId]);

  return result.rows[0] || null;
}

describe('Atomic Job Claiming (SKIP LOCKED)', () => {
  beforeEach(async () => {
    // Create a dedicated test queue
    const [queue] = await db('queues').insert({
      project_id: testProjectId,
      name: `test-atomic-${Date.now()}`,
      status: 'active',
      concurrency_limit: 100,
      priority: 1,
    }).returning('*');
    testQueueId = queue.id;

    // Register test workers
    for (const wid of TEST_WORKER_IDS) {
      await db('workers').insert({
        id: wid,
        hostname: `test-host-${wid}`,
        status: 'online',
        concurrency_slots: 5,
        last_heartbeat_at: new Date(),
      }).onConflict('id').merge();
    }
  });

  it('should never allow two workers to claim the same job', async () => {
    // Insert a single job
    await db('jobs').insert({
      queue_id: testQueueId,
      type: 'simulation',
      status: 'queued',
      payload: JSON.stringify({ test: true }),
      scheduled_at: new Date(),
    });

    // Three workers race to claim the same job concurrently
    const results = await Promise.all([
      simulateWorkerClaim(TEST_WORKER_IDS[0]),
      simulateWorkerClaim(TEST_WORKER_IDS[1]),
      simulateWorkerClaim(TEST_WORKER_IDS[2]),
    ]);

    // Exactly ONE worker should get the job
    const claims = results.filter(r => r !== null);
    expect(claims).toHaveLength(1);

    // Verify that job is claimed by exactly one worker
    const job = await db('jobs').where({ queue_id: testQueueId }).first();
    expect(job.status).toBe('claimed');
    expect(TEST_WORKER_IDS).toContain(job.claimed_by_worker);
  });

  it('should distribute N jobs across concurrent workers with no duplicates', async () => {
    const NUM_JOBS = 10;

    // Insert N queued jobs
    const jobInserts = Array.from({ length: NUM_JOBS }, (_, i) => ({
      queue_id: testQueueId,
      type: 'simulation',
      status: 'queued',
      payload: JSON.stringify({ index: i }),
      scheduled_at: new Date(),
    }));
    await db('jobs').insert(jobInserts);

    // Three workers each attempt to claim jobs in rapid succession
    const allClaims = [];
    const claimRounds = Array.from({ length: NUM_JOBS }, (_, i) =>
      simulateWorkerClaim(TEST_WORKER_IDS[i % TEST_WORKER_IDS.length])
    );
    const results = await Promise.all(claimRounds);
    allClaims.push(...results.filter(r => r !== null));

    // Every claimed job ID must be unique — no double-claims
    const claimedIds = allClaims.map(j => j.id);
    const uniqueIds = new Set(claimedIds);
    expect(uniqueIds.size).toBe(claimedIds.length);

    // All claimed jobs must have 'claimed' status
    for (const claim of allClaims) {
      expect(claim.status).toBe('claimed');
      expect(claim.claimed_by_worker).toBeTruthy();
    }
  });
});

describe('Stale Worker Recovery', () => {
  const STALE_THRESHOLD_MS = 30000;

  it('should requeue orphaned jobs from a crashed worker', async () => {
    // Create a test queue
    const [queue] = await db('queues').insert({
      project_id: testProjectId,
      name: `test-atomic-recovery-${Date.now()}`,
      status: 'active',
      concurrency_limit: 100,
      priority: 1,
    }).returning('*');

    const staleWorkerId = TEST_WORKER_IDS[0];

    // Register a worker with a stale heartbeat (45 seconds ago)
    await db('workers').insert({
      id: staleWorkerId,
      hostname: 'dead-host',
      status: 'online',
      concurrency_slots: 5,
      last_heartbeat_at: new Date(Date.now() - STALE_THRESHOLD_MS - 15000),
    }).onConflict('id').merge();

    // Insert 3 jobs as "claimed" by the stale worker (simulating a crash mid-processing)
    const orphanedJobs = Array.from({ length: 3 }, (_, i) => ({
      queue_id: queue.id,
      type: 'simulation',
      status: 'running',
      payload: JSON.stringify({ orphan: i }),
      claimed_by_worker: staleWorkerId,
      claimed_at: new Date(Date.now() - 60000),
      started_at: new Date(Date.now() - 55000),
      scheduled_at: new Date(),
    }));
    await db('jobs').insert(orphanedJobs);

    // Run the stale worker recovery logic (same as scheduler.service.js)
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);
    await db.transaction(async (trx) => {
      const staleWorkers = await trx('workers')
        .whereIn('status', ['online', 'busy'])
        .andWhere('last_heartbeat_at', '<', staleThreshold)
        .select('id');

      const staleWorkerIds = staleWorkers.map(w => w.id);
      
      await trx('workers')
        .whereIn('id', staleWorkerIds)
        .update({ status: 'offline', active_jobs: 0 });

      await trx('jobs')
        .whereIn('claimed_by_worker', staleWorkerIds)
        .whereIn('status', ['claimed', 'running'])
        .update({
          status: 'queued',
          claimed_by_worker: null,
          claimed_at: null,
          started_at: null,
          scheduled_at: new Date(),
          updated_at: new Date(),
        });
    });

    // Assert: the stale worker is now offline
    const worker = await db('workers').where({ id: staleWorkerId }).first();
    expect(worker.status).toBe('offline');

    // Assert: all orphaned jobs are back to 'queued' and no longer assigned
    const recoveredJobs = await db('jobs').where({ queue_id: queue.id });
    for (const job of recoveredJobs) {
      expect(job.status).toBe('queued');
      expect(job.claimed_by_worker).toBeNull();
      expect(job.claimed_at).toBeNull();
    }
  });
});
