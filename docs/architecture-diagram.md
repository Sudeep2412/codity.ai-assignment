# Architecture Diagram

This document illustrates the high-level system architecture of the Codity.ai Distributed Job Scheduling Platform.

```mermaid
graph TD
    subgraph Client [Client Tier]
        React[React Dashboard]
    end

    subgraph Server [API Server Tier]
        API[Express API Server]
        Auth[Auth Middleware]
        WS[WebSocket Server]
        Scheduler[Cron Scheduler]
        
        API --> Auth
        API --> WS
    end

    subgraph Worker [Worker Tier]
        Poller[Job Poller]
        Exec[Job Executor]
        Heartbeat[Heartbeat Service]
        
        Poller --> Exec
        Poller --> Heartbeat
    end

    subgraph Infrastructure [Infrastructure Tier]
        PG[(PostgreSQL)]
        Redis[(Redis Pub/Sub & Locks)]
    end

    %% Client Connections
    React -- "REST APIs (JSON)" --> API
    React -- "Socket.io (Events)" --> WS

    %% Server Connections
    API -- "CRUD, Create Jobs" --> PG
    WS -- "Subscribe to events" --> Redis
    Scheduler -- "Promote Scheduled Jobs" --> PG
    Scheduler -- "Distributed Lock" --> Redis

    %% Worker Connections
    Poller -- "SELECT FOR UPDATE SKIP LOCKED" --> PG
    Heartbeat -- "Worker Status" --> PG
    Exec -- "Publish Job Status" --> Redis
```

## Components Description

- **Client (React)**: Consumes REST APIs and maintains a WebSocket connection for live UI updates.
- **API Server (Express)**: Handles job creation, queue management, authentication, and serves as a WebSocket hub. Contains a background `SchedulerService` that uses a Redis lock to run exclusively on one instance to promote cron jobs into actual `jobs`.
- **Worker (Node.js)**: A lightweight, horizontally scalable polling engine that atomically claims jobs from PostgreSQL using `SELECT FOR UPDATE SKIP LOCKED`, executes them via a pluggable `Executor`, and publishes status events to Redis. It also maintains a heartbeat loop.
- **PostgreSQL**: The source of truth for all state, including organizations, users, queues, jobs, executions, and dead letter queues. Handles the concurrency control mechanism.
- **Redis**: Acts as an ephemeral message broker (Pub/Sub) for real-time WebSocket events and provides distributed locking primitives for the Scheduler.
