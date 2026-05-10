# Implementation Notes

# Backend

The backend was implemented using:
- Node.js
- Express
- TypeScript
- Prisma ORM
- BullMQ
- Redis

Key backend modules:
- Controllers
- Services
- Repositories
- Workers
- State machine
- Alert strategies

---

# Frontend

The frontend dashboard was implemented using:
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

Features:
- Incident table
- Auto-refresh polling
- Incident detail page
- RCA visibility
- Status transition controls
- Timeline visualization

---

# Queue Processing

Signal processing flow:

```txt
Incoming Signal
    ↓
MongoDB persistence
    ↓
BullMQ queue push
    ↓
Worker processing
    ↓
Debounce check
    ↓
Incident creation/linking
    ↓
Alert strategy execution
Dockerized Development

The project uses Docker Compose for local development.

Services:

PostgreSQL
MongoDB
Redis
API
Worker

Benefits:

Reproducible setup
Isolated services
Consistent development environment

---

# `sample-data/failure-simulation.json`

```json id="m4n5o6"
[
  {
    "component_id": "POSTGRES_CLUSTER",
    "severity": "P0",
    "message": "Primary PostgreSQL database unreachable",
    "timestamp": "2026-05-09T10:00:00Z"
  },
  {
    "component_id": "MCP_GATEWAY",
    "severity": "P1",
    "message": "MCP downstream timeout detected",
    "timestamp": "2026-05-09T10:01:00Z"
  },
  {
    "component_id": "CACHE_CLUSTER_01",
    "severity": "P2",
    "message": "Cache timeout exceeded",
    "timestamp": "2026-05-09T10:02:00Z"
  },
  {
    "component_id": "AUTH_SERVICE",
    "severity": "P1",
    "message": "Authentication latency spike detected",
    "timestamp": "2026-05-09T10:03:00Z"
  }
]