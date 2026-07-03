# Codity.ai - Distributed Job Scheduling Platform

A production-inspired distributed job scheduling platform capable of reliably executing asynchronous background jobs across multiple workers. Built with Node.js, Express, PostgreSQL, Redis, and React.

## Features

- **Queue Management**: Prioritization, concurrency limits, pause/resume.
- **Job Types**: Immediate, delayed, scheduled (cron), and batch jobs.
- **Atomic Claiming**: Uses PostgreSQL `SELECT FOR UPDATE SKIP LOCKED` for zero-contention atomic claiming.
- **Worker Isolation**: Separate worker processes that poll queues and send heartbeats.
- **Reliability**: Configurable retry strategies (fixed, linear, exponential backoff) and Dead Letter Queue (DLQ).
- **Dashboard**: Real-time React dashboard with WebSocket updates.

## Prerequisites

- Node.js 20+
- Docker and Docker Compose

## Quick Start

1. **Start the Infrastructure (PostgreSQL & Redis)**
   ```bash
   docker-compose up -d
   ```

2. **Install Dependencies**
   ```bash
   npm run install:all # (if implemented) or manually:
   cd server && npm install
   cd ../worker && npm install
   cd ../client && npm install
   ```

3. **Run Migrations & Seeds**
   ```bash
   cd server
   npm run migrate
   npm run seed
   ```

4. **Start the Services**
   Open three separate terminals:
   
   **Terminal 1 (API Server)**
   ```bash
   cd server
   npm run dev
   ```
   
   **Terminal 2 (Worker)**
   ```bash
   cd worker
   npm run dev
   ```
   
   **Terminal 3 (Dashboard)**
   ```bash
   cd client
   npm run dev
   ```

## Default Credentials
The seed script creates the following user:
- Email: `admin@codity.ai`
- Password: `password123`

## API Documentation
Once the server is running, visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for the Swagger OpenAPI documentation.

## Architecture

The platform is designed as a distributed, loosely-coupled system separating the API and background workers.

```mermaid
graph TD
    Client[React SPA Client] -->|REST| API[Express API Server]
    API --> DB[(PostgreSQL Master)]
    API --> Cache[(Redis)]
    
    subgraph Background Processing
    Worker1[Worker Process 1] -->|Polls & Locks| DB
    Worker2[Worker Process 2] -->|Polls & Locks| DB
    end
    
    Worker1 -.->|PubSub/Rate Limits| Cache
    Worker2 -.->|PubSub/Rate Limits| Cache
```

## Database Design

```mermaid
erDiagram
    users ||--o{ projects : creates
    projects ||--o{ queues : contains
    queues ||--o{ jobs : holds
    jobs ||--o{ job_executions : logs
    jobs ||--o| dead_letter_queue : fails_into
    workers ||--o{ jobs : claims
    
    users {
        uuid id PK
        string email
    }
    projects {
        uuid id PK
        uuid user_id FK
        string name
    }
    queues {
        uuid id PK
        uuid project_id FK
        string name
    }
    jobs {
        uuid id PK
        uuid queue_id FK
        string status
        uuid claimed_by_worker FK
    }
    workers {
        uuid id PK
        string status
        timestamp last_heartbeat_at
    }
    dead_letter_queue {
        uuid id PK
        uuid job_id FK
        string error_reason
    }
```

See `docs/design_decisions.md` for detailed system designs and architectural trade-offs.
