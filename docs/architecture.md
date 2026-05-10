# Architecture Overview

The Incident Management System (IMS) is designed as a distributed, queue-driven incident ingestion and management platform inspired by real-world SRE workflows.

The system separates ingestion, persistence, processing, and visualization responsibilities into independent layers.

---

# High-Level Architecture

```txt
Frontend (React + Vite)
        ↓
Backend API (Node.js + Express)
        ↓
 ┌───────────────┬───────────────┬───────────────┐
 │ PostgreSQL    │ MongoDB       │ Redis         │
 │ Incidents     │ Signals       │ Debounce      │
 └───────────────┴───────────────┴───────────────┘
        ↓
BullMQ Worker Queue
        ↓
Alert Strategy Engine + Incident Lifecycle State Machine
Core Components
Frontend

The frontend dashboard is built using React, TypeScript, Vite, and Tailwind CSS.

Features include:

Live incident dashboard
Severity and status filtering
Incident detail pages
Signal timeline visualization
MTTR display
RCA workflow visualization
Auto-refresh polling
Backend API

The backend API is implemented using Node.js, Express, and TypeScript.

Responsibilities:

Accept incoming monitoring signals
Validate request payloads
Queue signals for asynchronous processing
Expose incident management APIs
Handle incident state transitions
Persist structured incident data
PostgreSQL

PostgreSQL stores:

Incident metadata
Incident states
RCA information
MTTR metrics
Signal references

Prisma ORM is used for type-safe database access.

MongoDB

MongoDB stores raw incoming monitoring signals.

This separation allows:

Efficient event ingestion
Flexible signal schema evolution
Reduced relational database load
Redis

Redis is used for:

Debounce window management
Atomic incident locking
BullMQ queue backend

Redis enables concurrency-safe incident creation under high traffic.

BullMQ Workers

BullMQ workers process queued signals asynchronously.

Responsibilities:

Incident creation
Signal linking
Debounce enforcement
Alert routing
Strategy execution

This architecture prevents API blocking during traffic spikes.


---

# `docs/backpressure.md`

```md id="d4e5f6"
# Backpressure Handling Strategy

This project implements multiple backpressure handling mechanisms to ensure system stability during alert storms or high-volume signal ingestion.

---

# 1. Queue-Based Signal Ingestion

Incoming signals are not processed synchronously inside the API request lifecycle.

Instead:

```txt
API Request → BullMQ Queue → Worker Processing

Benefits:

Prevents API blocking
Smooths traffic spikes
Allows retry handling
Enables horizontal worker scaling

The API acknowledges requests immediately while workers process signals asynchronously.

2. Redis-Based Debouncing

To prevent incident explosions during noisy failures, Redis is used as a distributed debounce layer.

Mechanism:

debounce:{COMPONENT_ID}

Features:

Sliding debounce window
Duplicate signal suppression
Concurrent-safe incident creation
Automatic TTL expiration

Implementation uses atomic Redis commands:

SET NX EX

This guarantees only one incident is created for repeated signals during the debounce window.

3. Sliding Window Strategy

A sliding debounce window is used instead of a fixed window.

The sliding window resets TTL on every incoming signal, ensuring:

No new incident is created until signal traffic becomes quiet.
4. Worker Isolation

Heavy operations are isolated inside BullMQ workers.

Worker responsibilities include:

Incident creation
Signal linking
Alert strategy execution
RCA workflows

This separation keeps the API responsive even under high load.

Result

Under concurrent load:

5 simultaneous signals → 1 incident

This demonstrates:

Backpressure resilience
Concurrent-safe ingestion
Queue-driven architecture
Distributed coordination using Redis

---

# `docs/prompts.md`

```md id="g7h8i9"
# Prompts and Planning Notes

This project was designed iteratively using architecture planning, distributed systems design exploration, and implementation-focused prompts.

Key areas explored during development:

- Queue-driven backend architectures
- Redis debounce mechanisms
- State machine implementations
- BullMQ worker orchestration
- Incident lifecycle enforcement
- Polyglot persistence design
- Real-time dashboard workflows
- RCA workflow enforcement
- Distributed concurrency handling

---

# Major Architectural Decisions

## Why BullMQ?

BullMQ was selected to decouple ingestion from processing.

Benefits:
- Retry support
- Worker concurrency
- Redis-backed persistence
- Async processing model

---

## Why Multiple Databases?

### PostgreSQL
Used for:
- Relational incident workflows
- RCA data
- Status transitions
- MTTR metrics

### MongoDB
Used for:
- Raw monitoring signals
- Flexible event schemas
- High-volume ingestion

### Redis
Used for:
- Debounce state
- Queue infrastructure
- Atomic distributed locking

---

## Why State Pattern?

The State Pattern ensures business rules remain encapsulated inside state objects.

This avoids large conditional chains and improves maintainability.

---

## Why Strategy Pattern?

The Strategy Pattern enables severity-specific alert handling.

Future integrations such as:
- Slack
- PagerDuty
- Email
- SMS

can be added without modifying core processing logic.