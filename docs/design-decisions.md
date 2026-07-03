# Design Decisions and Trade-offs

This document outlines the core architectural and design decisions made while building the Codity.ai Distributed Job Scheduling Platform, along with their associated trade-offs.

## 1. PostgreSQL for Job State and Concurrency
**Decision**: Use PostgreSQL instead of Redis or RabbitMQ as the primary job queue store.
**Mechanism**: Worker instances use `SELECT ... FOR UPDATE SKIP LOCKED` to atomically claim jobs.
- **Pros**:
  - **Single Source of Truth**: Job state, queues, users, and execution history are stored in a unified, transactional system.
  - **Durability**: No lost jobs on crash.
  - **Relational Integrity**: Foreign keys ensure jobs cannot exist without queues, reducing orphaned data.
- **Cons**:
  - **Polling Overhead**: Requires frequent DB querying (currently every 5s) compared to event-driven push models (like RabbitMQ).
  - **Scaling Limit**: Eventually bottlenecks on row-level lock contention or connection pool saturation at extreme scale (10k+ ops/sec), requiring sharding.

## 2. Decoupled Redis Pub/Sub for Real-Time Events
**Decision**: Use Redis Pub/Sub for broadcasting WebSocket events, but strictly not for job data persistence.
- **Pros**:
  - Extremely fast broadcast capability.
  - Horizontally scales the WebSocket server using `@socket.io/redis-adapter` (multiple server instances can run seamlessly).
- **Cons**:
  - Ephemeral events. If a client is disconnected when an event fires, the event is lost. (Clients must fetch full state on reconnect).

## 3. Worker Architecture: Polling with Immediate Follow-up
**Decision**: The worker uses a fixed interval polling loop (`setTimeout`), but upon successfully claiming a job, it immediately attempts another claim using `setImmediate`.
- **Pros**:
  - **Backpressure**: Only claims a job if `activeCount < concurrency_limit`.
  - **Latency**: Near-zero latency when queues are full, but drops to idle polling when queues are empty, saving DB load.
- **Cons**:
  - Requires tuning the poll interval (too low = DB spam, too high = latency).

## 4. Job Execution with Promise.race Timeouts
**Decision**: The worker enforces a strict timeout on every job execution using `Promise.race([execution, timer])`.
- **Pros**:
  - Prevents "zombie" jobs where a stuck network call or infinite loop permanently hogs a worker concurrency slot.
- **Cons**:
  - Requires careful management in Node.js since the underlying async operation (e.g., an axios request) cannot be easily aborted unless an AbortController is passed all the way down to the user's job handler.

## 5. Denormalized Queue Statistics
**Decision**: `total_processed` and `total_failed` on the `queues` table are updated incrementally during job completion/failure instead of calculating `COUNT(*)` at read time.
- **Pros**:
  - Fast reads for dashboard statistics without full table scans.
- **Cons**:
  - Susceptible to drift in distributed failure scenarios. Should eventually implement a daily reconciliation background job.

## 6. Stale Worker Recovery
**Decision**: The centralized `SchedulerService` periodically cleans up jobs assigned to workers whose heartbeats have expired.
- **Pros**:
  - Guarantees jobs are requeued if a worker process OOMs, crashes, or loses power before a graceful shutdown.
- **Cons**:
  - Introduces a small window (e.g., 30s) where jobs are effectively "stuck" before recovery kicks in.
