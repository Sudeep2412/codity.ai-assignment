# Codity.ai — Senior Architect Fix List

> Comprehensive review against every evaluation criterion. Fixes are ranked **Critical → High → Medium → Low** within each section, with file references.

---

## 1 · System Architecture (20 marks)

### CRITICAL

| # | Fix | Why it matters | Affected files |
|---|------|----------------|----------------|
| A1 | **No Project CRUD API routes exist** — The assignment says *"Implement authentication and project management. Each project can own multiple job queues."* You have a `projects` table and seed data, but zero REST endpoints for creating, listing, updating, or deleting projects. | Loses marks under both "System Architecture" and "API Design". A reviewer will immediately notice the gap. | Create [project.routes.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/routes/project.routes.js), [project.controller.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/controllers/project.controller.js), [project.service.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/project.service.js), and register in [routes/index.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/routes/index.js) |
| A2 | **No Organization CRUD API** — Same problem. `organizations` and `org_members` tables exist but have no API surface at all. | Renders the multi-tenancy model untestable and unverifiable. | New `org.routes.js`, `org.controller.js`, `org.service.js` |
| A3 | **No Retry Policy CRUD API** — `retry_policies` are seeded but cannot be created or managed via API. Queue creation accepts `retryPolicyId` but a user can never create one. | The full lifecycle "configure queue → attach retry policy" is broken end-to-end. | New `retryPolicy.routes.js`, `retryPolicy.controller.js`, `retryPolicy.service.js` |

### HIGH

| # | Fix | Details |
|---|------|---------|
| A4 | **Scheduler distributed lock never releases** — In [scheduler.service.js:28-30](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/scheduler.service.js#L28-L30), you use `redis.set(lockKey, 'locked', 'NX', 'PX', lockTTL)` with TTL = 10s but never explicitly release it after the work completes. If the work finishes in 20ms, the lock sits for the full 10s, starving other instances. Add a `finally { await redis.del(lockKey) }` after the try block. |
| A5 | **Worker does not belong to any queue** — Workers are global and claim from **all** active queues. The assignment says *"Workers poll queues"* (plural, but scoped). Consider adding a `queue_ids` or `tags` filter to the worker so it can be assigned to specific queues. This is expected for queue-aware claiming. |
| A6 | **`scheduled_at` defaults to `NOW()` for immediate jobs** — In [job.service.js:19](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/job.service.js#L19), `scheduled_at` is set to `new Date()` regardless. This collapses the "Queued → Scheduled" lifecycle transition. For true delayed jobs, the status should be `'scheduled'` when `scheduledAt` is in the future. Currently all jobs start as `'queued'` even with a future `scheduledAt`. |

### MEDIUM

| # | Fix | Details |
|---|------|---------|
| A7 | **No `test` configuration in `knexfile.js`** — [knexfile.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/knexfile.js) has `development` and `production` but no `test` environment. This means integration tests cannot run against an isolated database. |
| A8 | **Separate `worker/config/` is a copy-paste of `server/config/`** — The `database.js`, `env.js`, and `redis.js` under `worker/` duplicate logic from `server/`. Extract a shared `shared/` or `common/` package to avoid drift. |

---

## 2 · Database Design (20 marks)

### CRITICAL

| # | Fix | Details |
|---|------|---------|
| D1 | **`idx_jobs_claimable` index is NOT a partial index** — In [007_create_jobs.js:21-23](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/migrations/007_create_jobs.js#L21-L23), you create `index(['queue_id', 'priority', 'created_at'])` as a full B-tree index. For the atomic claim query (which filters `WHERE status = 'queued' AND scheduled_at <= NOW()`), this index is **not used** because `status` is not the leading column. You need a **partial index**: `CREATE INDEX idx_jobs_claimable ON jobs (queue_id, priority, created_at) WHERE status = 'queued'`. This is a major performance concern. |
| D2 | **`idempotency_key` unique index with `predicate` doesn't work in Knex** — [007_create_jobs.js:25-27](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/migrations/007_create_jobs.js#L25-L27) uses `table.unique(..., { predicate: knex.whereNotNull('idempotency_key') })`. Knex does not support partial unique indexes via this API; it silently creates a regular unique index. This means `NULL` idempotency keys will conflict. Use a raw SQL migration: `CREATE UNIQUE INDEX idx_jobs_idempotency ON jobs (queue_id, idempotency_key) WHERE idempotency_key IS NOT NULL`. |

### HIGH

| # | Fix | Details |
|---|------|---------|
| D3 | **No index on `jobs.scheduled_at`** — The worker's claim query uses `j.scheduled_at <= NOW()` but there is no index on this column. Add `CREATE INDEX idx_jobs_scheduled_at ON jobs (scheduled_at) WHERE status = 'queued'`. |
| D4 | **`worker_heartbeats` table will grow unbounded** — Every heartbeat (every 10s per worker) inserts a row with no TTL or partitioning strategy. With 5 workers running 24h, that's ~43,200 rows/day. Add a periodic cleanup job or table partitioning. Document this in design-decisions. |
| D5 | **Missing `ON DELETE` cascade for `scheduled_jobs.last_job_id`** — In [011_create_scheduled_jobs.js:9](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/migrations/011_create_scheduled_jobs.js#L9), `last_job_id` references `jobs(id)` with `SET NULL`. If a job is deleted (e.g., via queue cascade), this orphans nothing, but the column semantics should be documented. More importantly, `scheduled_jobs` itself has no `enabled` index: `CREATE INDEX idx_scheduled_enabled ON scheduled_jobs (enabled, next_run_at) WHERE enabled = true`. |
| D6 | **`organizations` table missing `updated_at`** — Only has `created_at`. Inconsistent with the rest of the schema. |
| D7 | **ER diagram is incomplete** — [er-diagram.md](file:///c:/Users/sudee/Desktop/work/Codity.ai/docs/er-diagram.md) omits `scheduled_jobs`, `job_logs`, `worker_heartbeats`, and `dead_letter_queue` entity definitions (they appear in relationships but not in attributes). Also missing `timeout_ms` from the jobs entity. The assignment explicitly asks you to *"Explain primary keys, foreign keys, indexes, normalization, cascading behavior, and performance considerations."* — none of this prose exists. |

### MEDIUM

| # | Fix | Details |
|---|------|---------|
| D8 | **No database-level check constraints** — `priority` should be `CHECK (priority BETWEEN 1 AND 10)`, `concurrency_limit` should be `CHECK (concurrency_limit > 0)`. Currently only validated at the API layer via Joi; DB-level defense is missing. |
| D9 | **`jobs.payload` defaults to `'{}'`** — This is a string, not a proper JSON empty object. Use `.defaultTo(JSON.stringify({}))` or better, `.defaultTo(knex.raw("'{}'::jsonb"))`. |

---

## 3 · Backend Engineering (20 marks)

### CRITICAL

| # | Fix | Details |
|---|------|---------|
| B1 | **`/auth/me` endpoint returns the JWT payload, not the full user** — In [auth.controller.js:31-41](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/controllers/auth.controller.js#L31-L41), `req.user` is the decoded JWT (`{ id, role }`), not a full user record. The frontend's `AuthContext` expects `res.data.name` and `res.data.email`, which will be `undefined`. This means after page refresh, the sidebar shows "User" and an empty email. Fix: fetch the user from DB in the `me` handler using `req.user.id`. |
| B2 | **Job creation ignores delayed job status** — When `scheduledAt` is in the future, the job should have status `'scheduled'`, not `'queued'`. The worker claim query filters `j.scheduled_at <= NOW()` so it won't claim it prematurely, but the status is misleading and breaks the documented lifecycle `Queued → Scheduled → Claimed → Running → Completed`. |
| B3 | **Batch job `onConflict().ignore()` swallows all constraint errors** — In [job.service.js:52-57](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/job.service.js#L52-L57), if the idempotency constraint fires, those jobs are silently dropped. The response doesn't indicate which jobs were inserted vs. skipped. Add a `skipped` array in the response. |

### HIGH

| # | Fix | Details |
|---|------|---------|
| B4 | **No `retryJob` transaction** — [job.service.js:134-153](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/job.service.js#L134-L153) fetches the job, checks status, then updates — without a transaction. Under concurrency, two callers could both see `status = 'failed'` and both reset it. Use `UPDATE ... WHERE status = 'failed' RETURNING *` in one atomic statement. |
| B5 | **`cancelJob` has no transaction and no optimistic locking** — Same race condition as B4. Between the `SELECT` and `UPDATE`, the job could transition to `running`. Use a conditional `UPDATE jobs SET status = 'cancelled' WHERE id = ? AND status NOT IN ('completed', 'failed', 'cancelled') RETURNING *`. |
| B6 | **DLQ `retryDLQEntry` throws generic `Error` instead of `BadRequestError`** — In [dlq.service.js:50](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/dlq.service.js#L50), `throw new Error(...)` bypasses the structured error handling. Use `throw new BadRequestError(...)`. |
| B7 | **`metrics.service.js` `getErrorRate` returns raw array** — [metrics.service.js:25-26](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/metrics.service.js#L25-L26) destructures results as `const [completed] = await db(...)`. In Knex, `.count()` without `.first()` returns an array. This should use `.first()` like `getThroughput` does, otherwise `completed` is the first element of an array (which is fine accidentally, but inconsistent). |
| B8 | **Dashboard charts expect time-series data but API returns a scalar** — `getThroughput` returns `{ timeframe, processed: number }`. The frontend's `<LineChart data={throughput}>` expects an array of objects with `time` and `count` keys. The charts will render nothing. You need a proper time-series query that buckets jobs by minute/hour using `date_trunc`. |
| B9 | **Missing API for listing all jobs globally** — The `GET /api/jobs` route only has `/:jobId`, but no `GET /api/jobs` list endpoint without a `queueId`. The frontend hardcodes `queues[0].id` as a workaround. Add a global jobs list with pagination. |

### MEDIUM

| # | Fix | Details |
|---|------|---------|
| B10 | **No request logging of authenticated user** — Morgan logs HTTP method/path/status, but never logs `req.user.id`. For an observability-focused assignment, add user context to the logger. |
| B11 | **Swagger docs are incomplete** — Only [job.routes.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/routes/job.routes.js) has JSDoc annotations. Auth, queues, DLQ, and metrics routes have zero Swagger documentation. The assignment requires *"API documentation"* as a deliverable. |
| B12 | **No `GET /api/queues/:queueId/stats` shown in dashboard** — The endpoint exists but the frontend never calls it. The Queues page just shows raw `total_processed` / `total_failed` from the list response. Wire up the stats endpoint to show live job breakdown (queued/running/completed/failed). |

---

## 4 · Reliability & Concurrency (15 marks)

### CRITICAL

| # | Fix | Details |
|---|------|---------|
| R1 | **Timeout in `executor.js` does NOT cancel the underlying operation** — [executor.js:29-36](file:///c:/Users/sudee/Desktop/work/Codity.ai/worker/src/executor.js#L29-L36) uses `Promise.race` with a timeout rejection. When the timeout fires, the original `executionPromise` is still running (the `setTimeout` in `simulationHandler` hasn't been cleared). In production this means a "timed out" job's handler keeps executing and can still resolve/reject, potentially causing double state transitions. At minimum, pass an `AbortController.signal` to handlers. Document this limitation if not fixable. |
| R2 | **`handleJob` is fire-and-forget with no error boundary** — [poller.js:59](file:///c:/Users/sudee/Desktop/work/Codity.ai/worker/src/poller.js#L59) calls `this.handleJob(job)` without `await` and without `.catch()`. If `handleJob` throws before reaching the try/catch in executor (e.g., the `db.insert` for execution record fails), the rejection is unhandled. Add `.catch(err => logger.error(...))`. |
| R3 | **Stale worker recovery requeues `running` jobs without incrementing `attempt_number`** — [scheduler.service.js:115-125](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/scheduler.service.js#L115-L125) resets orphaned jobs to `status: 'queued'` and clears `claimed_by_worker`, but the `attempt_number` was already incremented during the original claim. On re-claim, it gets incremented again, which could prematurely exhaust retries. You should NOT reset `attempt_number` here but you should also not re-increment on claim; consider incrementing only on execution start, not on claim. |

### HIGH

| # | Fix | Details |
|---|------|---------|
| R4 | **Worker `active_jobs` counter is tracked by Executor's `activeExecutions.size` but is never decremented in the DB if a worker crashes** — The `workers.active_jobs` column is updated by heartbeat, but if the process dies between claim and heartbeat, the DB shows stale values. The stale-worker recovery should also reset `active_jobs = 0` when marking workers offline. |
| R5 | **No idempotent execution check** — The assignment says *"make execution idempotent wherever appropriate."* There is no mechanism to detect if a job was already completed when retrying (e.g., after a crash during the `markCompleted` transaction). If the transaction partially commits (execution updated, but job update fails), a retry will re-execute a completed job. Add an idempotency check: if `job_executions` already has a `completed` row for this `job_id` and `attempt_number`, skip execution. |
| R6 | **Heartbeat insert can fail silently during high load, leaving worker status stale** — In [heartbeat.js:62-64](file:///c:/Users/sudee/Desktop/work/Codity.ai/worker/src/heartbeat.js#L62-L64), the catch block logs but doesn't retry or escalate. If the heartbeat fails consistently (e.g., DB connection pool exhausted), the scheduler will mark the worker as stale and requeue its jobs while it's still running — causing duplicate execution. |

### MEDIUM

| # | Fix | Details |
|---|------|---------|
| R7 | **No distributed lock for `recoverStaleWorkers`** — It runs inside `scheduler.run()` which holds a lock, but the lock key is shared with `promoteScheduledJobs`. If one takes longer than the TTL, the other instance could start recovery concurrently. Use separate lock keys or extend TTL dynamically. |
| R8 | **Graceful shutdown doesn't requeue uncompleted jobs** — [gracefulShutdown.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/worker/src/gracefulShutdown.js) calls `poller.stop()` → `executor.drain()`. If drain times out, in-progress jobs are abandoned with status `running` in DB. The shutdown should requeue jobs that weren't completed within the drain window. |

---

## 5 · Frontend & UX (10 marks)

### CRITICAL

| # | Fix | Details |
|---|------|---------|
| F1 | **Jobs page hardcodes `queues[0].id`** — [JobsPage.jsx:16](file:///c:/Users/sudee/Desktop/work/Codity.ai/client/src/pages/JobsPage.jsx#L16). Users can never view jobs from other queues. Add a queue selector dropdown. |
| F2 | **DLQ page hardcodes `queues[0].id`** — Same issue in [DLQPage.jsx:15](file:///c:/Users/sudee/Desktop/work/Codity.ai/client/src/pages/DLQPage.jsx#L15). |
| F3 | **Dashboard charts render empty** — The API returns `{ timeframe: '1h', processed: 42 }` but the chart expects `[{ time: '12:00', count: 5 }, ...]`. The throughput and error rate visualizations are entirely broken. |
| F4 | **DLQ `failed_at` column references `entry.created_at`** — [DLQPage.jsx:63](file:///c:/Users/sudee/Desktop/work/Codity.ai/client/src/pages/DLQPage.jsx#L63) uses `entry.created_at` but the DLQ table has no `created_at` column; it has `failed_at`. This will display "Invalid Date". |

### HIGH

| # | Fix | Details |
|---|------|---------|
| F5 | **No queue configuration UI** — The assignment says *"queue configuration"*. The Queues page is read-only; there's no way to pause/resume, update concurrency, or create queues from the dashboard. |
| F6 | **No execution logs view** — The assignment says *"inspect jobs, execution logs"*. There is no UI to view job details or execution history. The job table rows aren't even clickable. Add a job detail drawer/modal showing executions, logs, retry history, and worker assignment. |
| F7 | **No retry/cancel buttons on Jobs page** — The API supports `POST /jobs/:id/retry` and `DELETE /jobs/:id` (cancel), but the Jobs table has no action column. |
| F8 | **WebSocket `useSocket` listens for `job:completed` and `job:failed` events but the server emits `job:status_changed` and `dashboard:update`** — [socketServer.js:57-59](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/websocket/socketServer.js#L57-L59) vs [useSocket.js:25-36](file:///c:/Users/sudee/Desktop/work/Codity.ai/client/src/hooks/useSocket.js#L25-L36). The event names don't match, so WebSocket live updates are completely non-functional. |
| F9 | **No registration page** — Login page exists but no way to register a new user from the UI. You have the API (`POST /auth/register`). |

### MEDIUM

| # | Fix | Details |
|---|------|---------|
| F10 | **No responsive/mobile layout** — The sidebar is a fixed 250px with no collapse behavior. On small screens the layout breaks. |
| F11 | **No loading skeleton or error states** — Pages show raw "Loading..." text. Use skeleton placeholders for a polished UX. |
| F12 | **No auto-refresh / polling interval for data** — React Query's `refetchInterval` is not set. The only refresh mechanism is WebSocket (which is broken per F8). Add `refetchInterval: 5000` as fallback. |

---

## 6 · API Design (5 marks)

### HIGH

| # | Fix | Details |
|---|------|---------|
| P1 | **Inconsistent response envelope** — Most endpoints return `{ success: true, data: ... }`, but list endpoints return `{ success: true, data: [...], meta: {...} }`. The `data` key sometimes contains the paginated items, sometimes not (queue controller spreads `...result` which has `data` and `meta` as siblings). Standardize to `{ success, data, meta? }`. |
| P2 | **No `GET /api/workers` endpoint** — Workers are only accessible via `GET /api/metrics/workers`, which is semantically wrong. Workers are a first-class resource and should have their own route namespace. |
| P3 | **DLQ global routes use `/:entryId/retry` but are mounted at `/api/dlq`** — The full path is `/api/dlq/:entryId/retry`. But there's no `GET /api/dlq` to list all DLQ entries across queues. A global DLQ view requires fetching from every queue individually. |
| P4 | **No proper HTTP status code for "already cancelled/retried" DLQ** — Returns a generic 500 because of `throw new Error(...)` (fix B6). Should be 409 Conflict or 400. |
| P5 | **Missing `Content-Type` validation** — No middleware rejects requests with wrong `Content-Type` on POST/PATCH endpoints. |

---

## 7 · Documentation (5 marks)

### HIGH

| # | Fix | Details |
|---|------|---------|
| DC1 | **No API documentation deliverable** — The assignment requires *"API documentation"* as a separate deliverable. You have partial Swagger JSDoc on 4 endpoints out of ~20+. Either complete the Swagger annotations or create a dedicated `docs/api-documentation.md` with all endpoints documented. |
| DC2 | **Design decisions document is thin** — [design-decisions.md](file:///c:/Users/sudee/Desktop/work/Codity.ai/docs/design-decisions.md) covers 6 points but omits critical trade-offs: why JWT over sessions, why UUIDs over auto-increment, why Knex over Prisma, why React Query, why monorepo workspaces, RBAC model decisions, choice of Socket.io over SSE, etc. |
| DC3 | **ER diagram missing attribute details and documentation prose** — The assignment specifically asks to *"Explain primary keys, foreign keys, indexes, normalization, cascading behavior, and performance considerations"*. The current ER diagram is just a mermaid chart with no written analysis. Add a companion section with: normalization level (3NF), justification for denormalized `total_processed`/`total_failed`, index strategy explanation, cascade behavior rationale for each FK. |
| DC4 | **Architecture diagram lacks data flow descriptions** — Add numbered flow arrows showing: (1) job creation flow, (2) job claiming flow, (3) heartbeat cycle, (4) stale recovery flow, (5) WebSocket event flow. |
| DC5 | **README setup instructions are incomplete** — `npm run install:all` doesn't exist. No mention of `.env` setup. The workspace `npm install` from root should suffice but isn't documented. |

---

## 8 · Testing (5 marks)

### CRITICAL

| # | Fix | Details |
|---|------|---------|
| T1 | **Only 4 test files total** — `retry.service.test.js`, `validate.test.js`, `errors.test.js`, `pagination.test.js`. All are pure unit tests. There are zero integration tests and zero API endpoint tests. The assignment says *"Automated tests for critical functionality."* At minimum, add: (a) Auth flow integration test, (b) Job creation + claim + complete integration test, (c) Retry/DLQ flow test, (d) Atomic claim concurrency test. |
| T2 | **`retry.service.test.js` duplicates logic instead of testing the actual service** — [retry.service.test.js:7-25](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/__tests__/retry.service.test.js#L7-L25) re-implements `calculateDelay` inline rather than importing from `retry.service.js` or `poller.js`. This means the test could pass while the actual code has a different implementation. Import and test the real function. |
| T3 | **No worker tests** — `worker/package.json` has `"test": "jest"` but there are zero test files in the worker package. Add tests for: poller claim query, executor timeout, heartbeat logic, graceful shutdown. |

### HIGH

| # | Fix | Details |
|---|------|---------|
| T4 | **No test database configuration** — Without a `test` env in `knexfile.js` and a test database, you cannot run integration tests against a real PostgreSQL instance. |
| T5 | **`supertest` is listed as a dev dependency but never used** — You have it installed but no API tests use it. |

---

## 9 · Bonus Features Status

| Feature | Status | Fix Needed |
|---------|--------|------------|
| Workflow dependencies | ❌ Not implemented | Add `depends_on` column to `jobs` table, skip claiming until deps complete |
| Rate limiting | ✅ Auth endpoints only | Extend to job creation endpoints (e.g., 100 jobs/min per user) |
| Distributed locking | ✅ Scheduler lock | Working but has the release issue (A4) |
| Queue sharding | ❌ Not implemented | Can mention as future work in design-decisions |
| Event-driven execution | ⚠️ Partial | Redis Pub/Sub exists but only for WebSocket relay, not for triggering execution |
| WebSocket live updates | ⚠️ Broken | Event name mismatch (F8) |
| RBAC | ✅ Implemented | Working with `requireRole` and `resourceAuth` middleware |
| AI-generated failure summaries | ⚠️ Stub | [dlq.service.js:25](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/dlq.service.js#L25) uses a hardcoded template string. Not truly AI-generated. Either integrate an LLM API call or clearly document it as a simulation. |

---

## 10 · Quick-Win Summary (Top 15 by impact-to-effort ratio)

| Priority | Fix ID | Description | Effort |
|----------|--------|-------------|--------|
| 🔴 | **B1** | `/auth/me` returns JWT payload not user record | 5 min |
| 🔴 | **F8** | WebSocket event name mismatch → live updates broken | 5 min |
| 🔴 | **F4** | DLQ `created_at` → `failed_at` column reference | 2 min |
| 🔴 | **B6** | DLQ `throw new Error` → `throw new BadRequestError` | 2 min |
| 🔴 | **R2** | Add `.catch()` to fire-and-forget `handleJob` call | 2 min |
| 🔴 | **A4** | Add `finally { redis.del(lockKey) }` to scheduler | 3 min |
| 🟡 | **D1** | Fix partial index for claimable jobs (raw SQL migration) | 10 min |
| 🟡 | **D2** | Fix idempotency partial unique index (raw SQL migration) | 10 min |
| 🟡 | **B8** | Time-series throughput query for dashboard charts | 30 min |
| 🟡 | **A1** | Add Project CRUD endpoints | 30 min |
| 🟡 | **F1/F2** | Add queue selector to Jobs/DLQ pages | 20 min |
| 🟡 | **DC1** | Complete Swagger annotations or API doc | 45 min |
| 🟡 | **T1** | Add at minimum 3 integration tests | 60 min |
| 🟡 | **F5/F6** | Add queue config UI + job detail modal | 60 min |
| 🟡 | **DC3** | Add ER diagram prose (indexes, FKs, normalization) | 30 min |

---

> **Summary**: The core architecture (PostgreSQL atomic claiming, Redis Pub/Sub, separate worker process, heartbeat + stale recovery) is **solid and well-designed**. The biggest gaps are: (1) missing CRUD APIs for core entities (projects, orgs, retry policies), (2) broken frontend data bindings (charts, event names, column references), (3) insufficient tests, and (4) documentation that doesn't fully satisfy the rubric's explicit requirements. Fixing the ~15 quick-wins above would materially improve the score across all 8 evaluation categories.
