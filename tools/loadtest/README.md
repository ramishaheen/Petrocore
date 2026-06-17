# Load testing — simultaneous nationwide assessment

The platform targets **nationwide simultaneous assessment in days, not months**, so the
assessment + gap-analysis hot path must hold up under many concurrent users. This directory
contains a [k6](https://k6.io) load test for that scenario.

## Prerequisites

- A running API (and seeded DB): `docker compose up` then `docker compose exec api python -m app.seed.seed_all`.
- [k6](https://k6.io/docs/get-started/installation/) installed locally.

## Run

```bash
# default: ramp to 200 virtual users for ~2 minutes
BASE_URL=http://localhost:8000/api/v1 k6 run tools/loadtest/assessment_load.js

# scale up (e.g. 2000 concurrent users for 5 minutes)
VUS=2000 DURATION=5m BASE_URL=http://localhost:8000/api/v1 k6 run tools/loadtest/assessment_load.js
```

## What it does

Each virtual user logs in, discovers an employee + competency, and runs `POST /assessments/run`
(the AI scoring path), then pauses. Custom metrics: `login_ms`, `assessment_ms`, `errors`.

## Thresholds (fail the run if breached)

- `assessment_ms` p95 < **800 ms**
- error rate < **1%** (`errors` and `http_req_failed`)

## Scaling notes

- The API is stateless — scale horizontally behind a load balancer.
- Move assessment scoring / fusion / impact recompute to the Celery workers (`worker` service)
  for spiky nationwide windows; the synchronous path here is the worst case.
- Postgres: ensure connection pooling (e.g. PgBouncer) and an index review before a real campaign.
- Run k6 from a host close to the API to avoid measuring WAN latency.
