# Plan A: Make the Platform Alive & Functional

> **Goal**: Transform the dashboard from a static display into a fully interactive, real-time operations platform where you can create jobs, manage queues, simulate workloads, and watch everything flow through the system live.

---

## Current State (What's Broken)

````carousel
![Current Dashboard — empty charts, zero activity](C:\Users\sudee\.gemini\antigravity-ide\brain\9b790fb4-f402-4cc9-a77e-d76ee836577a\dashboard_page_1783081875619.png)
<!-- slide -->
![Jobs Page — permanently empty, no way to create jobs](C:\Users\sudee\.gemini\antigravity-ide\brain\9b790fb4-f402-4cc9-a77e-d76ee836577a\jobs_page_1783081911541.png)
<!-- slide -->
![Workers Page — no workers registered](C:\Users\sudee\.gemini\antigravity-ide\brain\9b790fb4-f402-4cc9-a77e-d76ee836577a\workers_page_1783081924906.png)
````

**Core problems**:
- No way to create jobs from the UI → tables are always empty
- Dashboard charts are broken (API returns scalar, chart expects time-series array)
- WebSocket event names don't match → live updates are dead
- Jobs/DLQ pages hardcode `queues[0].id` → can only see one queue
- `/auth/me` returns JWT payload, not user data → sidebar shows incomplete info
- No queue management controls (pause/resume/create)
- No job detail view, no retry/cancel actions

---

## Phase 1: Fix Critical Backend Bugs (30 min)

These are quick wins that unblock everything else.

### [MODIFY] [auth.controller.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/controllers/auth.controller.js)
- Fix `/auth/me` to fetch full user record from DB using `req.user.id` instead of returning raw JWT payload

### [MODIFY] [metrics.service.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/metrics.service.js)
- Replace scalar throughput response with proper **time-series query** using `date_trunc('minute', completed_at)` grouped by time buckets
- Replace scalar error rate response with time-series data for the bar chart
- Both endpoints return `[{ time: '12:05', count: 3 }, ...]` format

### [MODIFY] [socketServer.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/websocket/socketServer.js)
- Emit specific event names (`job:completed`, `job:failed`, `job:started`, `job:retrying`) instead of generic `job:status_changed`

### [MODIFY] [scheduler.service.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/scheduler.service.js)
- Add `finally { await redis.del(lockKey) }` to release distributed lock immediately after work completes

### [MODIFY] [dlq.service.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/dlq.service.js)
- Change `throw new Error(...)` to `throw new BadRequestError(...)` for proper error handling

### [MODIFY] [job.service.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/services/job.service.js)
- Set status to `'scheduled'` when `scheduledAt` is in the future (proper lifecycle)
- Use transactions for `retryJob` and `cancelJob` with conditional WHERE clauses

---

## Phase 2: Add Missing Backend APIs (45 min)

### [NEW] Project CRUD
- `server/src/routes/project.routes.js` — CRUD routes for `/api/projects` and `/api/projects/:projectId`
- `server/src/controllers/project.controller.js`
- `server/src/services/project.service.js`

### [NEW] Organization CRUD
- `server/src/routes/org.routes.js` — `/api/organizations` 
- `server/src/controllers/org.controller.js`
- `server/src/services/org.service.js`

### [NEW] Retry Policy CRUD
- `server/src/routes/retryPolicy.routes.js` — `/api/retry-policies`
- `server/src/controllers/retryPolicy.controller.js`
- `server/src/services/retryPolicy.service.js`

### [NEW] Job Simulation API endpoint
- `POST /api/simulate/burst` — Creates N jobs across queues with configurable fail probability and delay
- This is the key endpoint that makes the dashboard come alive from the UI

### [MODIFY] [routes/index.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/server/src/routes/index.js)
- Register all new routes

---

## Phase 3: Make Frontend Interactive (1.5 hrs)

### [MODIFY] [JobsPage.jsx](file:///c:/Users/sudee/Desktop/work/Codity.ai/client/src/pages/JobsPage.jsx)
- Add **queue selector dropdown** (replace hardcoded `queues[0].id`)
- Add **"Create Job" modal** with form fields: type, payload (JSON editor), priority, scheduled time, idempotency key
- Add **action column** to the table: Retry (for failed), Cancel (for queued/running), View Details
- Add **job detail slide-over panel** showing: payload, execution history, logs, worker assignment, timestamps
- Add `refetchInterval: 5000` for auto-refresh

### [MODIFY] [QueuesPage.jsx](file:///c:/Users/sudee/Desktop/work/Codity.ai/client/src/pages/QueuesPage.jsx)
- Add **"Create Queue" modal** with fields: name, priority, concurrency limit, retry policy selector
- Add **action column**: Pause/Resume toggle button, Edit, Delete, View Stats
- Add **queue stats drawer** showing live job breakdown (queued/running/completed/failed) using the `/stats` endpoint
- Add **"Create Queue" button** in the header

### [MODIFY] [DLQPage.jsx](file:///c:/Users/sudee/Desktop/work/Codity.ai/client/src/pages/DLQPage.jsx)
- Add **queue selector dropdown** (replace hardcoded `queues[0].id`)
- Fix column reference `created_at` → `failed_at`
- Add **expandable row** showing: AI failure summary, execution history JSON, payload

### [MODIFY] [DashboardPage.jsx](file:///c:/Users/sudee/Desktop/work/Codity.ai/client/src/pages/DashboardPage.jsx)
- Fix chart data bindings (charts now receive time-series arrays)
- Add **4th stat card**: "Error Rate" with percentage
- Add **quick action buttons**: "Create Job", "Launch Burst Simulation"

### [MODIFY] [WorkersPage.jsx](file:///c:/Users/sudee/Desktop/work/Codity.ai/client/src/pages/WorkersPage.jsx)
- Add **utilization bar** for each worker (active_jobs / concurrency_slots)
- Add **heartbeat history sparkline** (last 10 heartbeats)
- Color-code rows by status: green=online, blue=busy, red=offline

### [MODIFY] [useSocket.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/client/src/hooks/useSocket.js)
- Update event listeners to match corrected server event names
- Add `dashboard:update` listener for general invalidation

---

## Phase 4: Simulation Control Panel (30 min)

> [!IMPORTANT]
> This is the feature that makes the platform feel **alive** without dummy data. Everything is real — jobs go through the actual claim → execute → complete/fail pipeline.

### [NEW] `client/src/components/SimulationPanel.jsx`
A floating control panel (accessible from Dashboard) with:
- **Burst mode**: "Send 50 jobs" button → calls `POST /api/simulate/burst` with configurable parameters
- **Job type selector**: email, report, webhook, simulation
- **Fail probability slider**: 0% → 50% (controls how many jobs will intentionally fail to populate DLQ)
- **Delay slider**: 0ms → 5000ms (controls simulated execution time)
- **Scheduled job creator**: Create a cron job with visual cron builder
- **Real-time counter**: Shows jobs created / running / completed / failed updating live via WebSocket

### Backend support for simulation:

### [NEW] `server/src/routes/simulate.routes.js`
```
POST /api/simulate/burst
  body: { queueId, count, jobType, failProbability, durationMs }
  → Creates `count` jobs in the specified queue with the given payload
```

This way when you demo:
1. Open Dashboard → click "Launch Simulation"
2. Choose: 30 email jobs, 15% fail rate, 1-3s duration
3. Watch the charts, job table, workers page, and DLQ fill up in real time
4. All via the actual system — no fake data

---

## Phase 5: Auto-Refresh & Live Experience (20 min)

### [MODIFY] All pages
- Add `refetchInterval: 5000` to all React Query hooks as fallback polling
- Add `staleTime: 2000` to prevent unnecessary refetches

### [MODIFY] [useSocket.js](file:///c:/Users/sudee/Desktop/work/Codity.ai/client/src/hooks/useSocket.js)
- Add reconnection logic with exponential backoff
- Add connection status indicator in the sidebar (green dot = connected, yellow = reconnecting)

### [MODIFY] [DashboardPage.jsx](file:///c:/Users/sudee/Desktop/work/Codity.ai/client/src/pages/DashboardPage.jsx)
- Add **live activity feed** at the bottom: shows last 20 job events streaming in (green = completed, red = failed, yellow = retrying)

---

## Verification Plan

After implementation:
1. Start the worker process (`npm run dev:worker`)
2. Login to dashboard, click "Launch Simulation" with 30 jobs
3. Verify: Dashboard charts populate in real-time, Jobs table fills, Workers page shows active workers, DLQ shows failed jobs
4. Verify: Pause a queue → jobs in that queue stop being processed
5. Verify: Retry a failed job from the Jobs page → it gets reprocessed
6. Verify: Retry a DLQ entry → new job appears in the queue
