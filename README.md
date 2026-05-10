# 🚨 Incident Management System (IMS)

A production-style distributed Incident Management System built with React, Node.js, PostgreSQL, MongoDB, Redis, BullMQ, and Docker.

Designed to simulate real-world incident handling workflows used by SRE and platform engineering teams.

---

# Live System Architecture

```txt
Frontend (React + Vite)
        ↓
Backend API (Node.js + Express)
        ↓
 ┌───────────────┬───────────────┬───────────────┐
 │ PostgreSQL    │ MongoDB       │ Redis         │
 │ (Incidents)   │ (Signals)     │ (Debounce)    │
 └───────────────┴───────────────┴───────────────┘
        ↓
BullMQ Worker Queue
        ↓
Alert Strategy Engine + Incident Lifecycle Management
```

---

#  Key Features

## Real-Time Incident Ingestion

* Accepts incoming monitoring signals/events through REST APIs
* Supports multiple severity levels:

  * P0 — Critical
  * P1 — High
  * P2 — Moderate
* Automatically queues signals for asynchronous processing using BullMQ

---

## Distributed Debounce System

Implemented a Redis-based debounce mechanism to prevent duplicate incidents during alert storms.

### Features:

* Atomic Redis locking using `SET NX EX`
* Sliding debounce window
* Concurrent-safe incident creation
* Prevents duplicate incidents under high traffic

### Result:

5 simultaneous signals → 1 incident created.

---

## Incident Lifecycle State Machine

Implemented the State Design Pattern to enforce valid incident transitions.

### Incident States:

```txt
OPEN → INVESTIGATING → RESOLVED → CLOSED
```

### Rules Enforced:

* Cannot resolve before acknowledging
* Cannot close before resolving
* Cannot close without RCA submission
* Invalid transitions throw custom errors

---

## 📋 RCA (Root Cause Analysis) Workflow

Supports structured post-incident RCA submissions.

### RCA Includes:

* Root cause
* Fix applied
* Prevention steps
* Impact duration
* Submission metadata

### Business Rule:

Incidents cannot be closed until RCA is submitted.

---

## Live Incident Dashboard

Interactive React dashboard with auto-refreshing incident data.

### Features:

* Live incident updates
* Severity badges
* Status badges
* MTTR tracking
* RCA indicators
* Filtering by severity/status
* Signal timeline view
* Incident detail pages

---

## Queue-Based Processing Architecture

Used BullMQ workers for background processing.

### Worker Responsibilities:

* Incident creation
* Signal linking
* Alert routing
* Debounce handling
* Strategy execution

### Benefits:

* Non-blocking API
* Scalable processing
* Retry support
* Fault isolation

---

##  Alert Strategy Pattern

Implemented the Strategy Design Pattern for severity-based alert handling.

### Example Strategies:

* P0 → Critical escalation
* P1 → High-priority alerting
* P2 → Moderate alert routing

This architecture allows easy extension for:

* PagerDuty
* Slack
* Email
* SMS integrations

---

# Tech Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router

## Backend

* Node.js
* Express.js
* TypeScript
* Prisma ORM

## Databases

* PostgreSQL → Incident metadata
* MongoDB → Raw signal storage
* Redis → Debouncing + queue state

## Queueing

* BullMQ
* Redis Streams

## DevOps

* Docker
* Docker Compose
* Render Deployment

---

#  Core Engineering Concepts Demonstrated

* Distributed systems fundamentals
* Queue-based architectures
* Redis atomic operations
* Worker-based asynchronous processing
* State Design Pattern
* Strategy Design Pattern
* Fault-tolerant backend design
* Database polyglot persistence
* Concurrency-safe incident handling
* Real-time dashboard updates

---

# 📂 Project Structure

```txt
ims-project/
│
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── api/
│   │   └── utils/
│
├── backend/                  # Node.js backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── workers/
│   │   ├── repositories/
│   │   ├── state-machine/
│   │   ├── strategies/
│   │   └── routes/
│
├── docker-compose.yml
└── README.md
```

---

# Local Setup

## 1. Clone Repository

```bash
git clone <repo_url>
cd ims-project
```

---

## 2. Start Docker Services

```bash
docker compose up --build
```

Services started:

* PostgreSQL
* MongoDB
* Redis
* API
* Worker

---

## 3. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```txt
http://localhost:5173
```

Backend:

```txt
http://localhost:3000
```

---

#  Example API Requests

## Create Signal

```http
POST /api/signals
```

```json
{
  "component_id": "PAYMENT_GATEWAY",
  "severity": "P1",
  "message": "Payment timeout exceeded",
  "timestamp": "2026-05-09T10:00:00Z"
}
```

---

## Transition Incident

```http
PATCH /api/incidents/:id/status
```

```json
{
  "action": "acknowledge"
}
```

---
Add this section near your “Example API Requests” or after “Local Setup” in the README. Your current README content is in 

---

# Sample Failure Simulation

Use the provided sample failure dataset to simulate incidents across the stack.

Location:

```txt id="a1b2c3"
sample-data/failure-simulation.json
```

This dataset includes:

* PostgreSQL outage
* MCP gateway timeout
* Redis memory pressure
* Cache cluster failures
* API gateway failures
* Authentication latency spikes

---

## Send All Sample Signals

Run the following command from the project root:

```bash id="d4e5f6"
jq -c '.[]' sample-data/failure-simulation.json | while read line; do
  curl -X POST http://localhost:3000/api/signals \
    -H "Content-Type: application/json" \
    -d "$line"
  echo
done
```

This automatically sends all sample incidents into the ingestion pipeline.

---

## Expected Behavior

The system will:

* Persist raw signals in MongoDB
* Queue processing jobs using BullMQ
* Apply Redis debounce protection
* Create or link incidents in PostgreSQL
* Trigger severity-based alert strategies
* Update the React dashboard in real time

---

## Debounce Demonstration

Multiple rapid signals for the same component should produce:

```txt id="g7h8i9"
5 simultaneous signals → 1 incident created
```

This demonstrates:

* backpressure handling
* concurrent-safe ingestion
* distributed coordination using Redis
* queue-based worker processing 🚀

---

#  Metrics Supported

* MTTR (Mean Time To Resolution)
* Incident count
* Active incidents
* RCA pending incidents
* Signal aggregation

---

# Future Improvements

* WebSocket-based live updates
* JWT authentication
* Role-based access control
* Slack/PagerDuty integrations
* Kubernetes deployment
* OpenTelemetry tracing
* CI/CD pipelines
* Grafana dashboards
* Alert analytics

---

#  Author

Built by Aashi Yadav

Focused on distributed systems, backend engineering, scalable architectures, and full-stack development.

