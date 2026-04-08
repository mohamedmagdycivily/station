# Station Transfer Events API

A NestJS service that ingests station transfer events in batches and provides per-station reconciliation summaries. Built with idempotent writes, concurrency safety, and a CQRS read model for O(1) summary lookups.

## Tech Stack

- **NestJS 10** (TypeScript) — Framework
- **PostgreSQL 15** — Primary database
- **Sequelize 6** — ORM (sequelize-typescript)
- **Umzug** — Database migrations
- **Docker & Docker Compose** — Containerization
- **Swagger / OpenAPI** — API documentation
- **Jest & Supertest** — Testing

## Prerequisites

- **Node.js** 20+
- **Docker** 20.10+ & **Docker Compose** 2.0+
- **PostgreSQL 15** (or use Docker)

## Getting Started

### Run with Docker (recommended)

```bash
cp .env.example .env
docker compose up --build
```

This starts PostgreSQL and the app, runs migrations automatically, and exposes:

- **API**: http://localhost:3001
- **Swagger UI**: http://localhost:3001/api

### Run Locally

1. Start a PostgreSQL instance (or use the Docker one):
   ```bash
   docker compose up main-db -d
   ```

2. Install dependencies and start the app:
   ```bash
   cp .env.example .env
   npm install
   npm run start:migrate:dev
   ```

## Running Tests

```bash
npm test
```

Tests include unit tests (mocked store), controller integration tests (supertest), cron aggregation tests, and a concurrency test against a real PostgreSQL instance.

## API

All responses are wrapped by `StandardInterceptor`:
```json
{ "status": "SUCCESS", "message": "Operation Succeeded.", "data": { ... } }
```

Errors are wrapped by `HttpExceptionFilter`:
```json
{ "status": "ERROR", "errors": [{ "message": "..." }] }
```

### POST /api/v1/transfers — Bulk ingest transfer events

```bash
curl -X POST http://localhost:3001/api/v1/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "event_id": "evt-abc-123",
        "station_id": "station-001",
        "amount": 150.50,
        "status": "approved",
        "created_at": "2025-01-15T10:30:00.000Z"
      },
      {
        "event_id": "evt-abc-124",
        "station_id": "station-001",
        "amount": 200.00,
        "status": "rejected",
        "created_at": "2025-01-15T10:31:00.000Z"
      }
    ]
  }'
```

**Response** (201):
```json
{
  "status": "SUCCESS",
  "message": "Operation Succeeded.",
  "data": {
    "inserted": 2,
    "duplicates": 0
  }
}
```

Re-sending the same batch returns `{ "inserted": 0, "duplicates": 2 }` — fully idempotent.

### GET /api/v1/stations/:station_id/summary — Reconciliation summary

```bash
curl http://localhost:3001/api/v1/stations/station-001/summary
```

**Response** (200):
```json
{
  "status": "SUCCESS",
  "message": "Operation Succeeded.",
  "data": {
    "station_id": "station-001",
    "total_approved_amount": 150.50,
    "events_count": 2
  }
}
```

A non-existent station returns zeroes (not 404):
```json
{ "data": { "station_id": "unknown", "total_approved_amount": 0, "events_count": 0 } }
```

## Design Decisions

### Idempotency

Each event carries a globally unique `event_id`. The `transfer_events` table has a `UNIQUE` constraint on `event_id`. Bulk inserts use `ON CONFLICT (event_id) DO NOTHING` (via Sequelize `bulkCreate` with `ignoreDuplicates: true`), so re-sending the same events is safe and produces zero duplicates.

### Concurrency Safety

No application-level locking is needed. The PostgreSQL `UNIQUE` constraint on `event_id` serializes conflicting inserts at the database level. Two simultaneous POST requests with overlapping event IDs will have one succeed and the other silently skip the duplicates.

### CQRS Pattern

- **Write path**: `POST /transfers` inserts into `transfer_events` (append-only).
- **Read path**: `GET /stations/:id/summary` reads from `station_summaries` (O(1) lookup).
- **Background aggregation**: A cron job runs every 30 minutes, aggregates unprocessed events per station, upserts into `station_summaries`, and marks events as processed.

### Eventual Consistency

The GET summary endpoint may return data up to 30 minutes stale (the cron interval). This is an accepted tradeoff for O(1) read performance. The cron job processes all unprocessed events in a single transaction, so the read model is always consistent with itself.

### Fail-Fast Validation

If any event in a batch fails validation, the entire batch is rejected with a 400 error. No partial inserts occur. This is enforced by `class-validator` with `@ValidateNested({ each: true })`.

### Events Count

`events_count` in the summary counts ALL events regardless of status (approved, rejected, pending, etc.). This gives a complete picture of station activity. Only `total_approved_amount` filters by `status = 'approved'`.

### Swappable Store

The service depends on an abstract `TransferStoreInterface` (injected via `@Inject('TRANSFER_STORE')`), not the concrete `TransferEventRepository`. The binding is done in the module via `{ provide: 'TRANSFER_STORE', useExisting: TransferEventRepository }`. This allows swapping the storage layer without changing the service.
