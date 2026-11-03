# OoruShare — Hyperlocal Residential Loading-Dock Co-pilot

> **IBM Bobathon: Build for Bengaluru** — Theme 1: *Smarter Streets Better Living*  
> *Turning 2 metres of Bengaluru curb space into a shared community asset.*  
> **Built with IBM Bob** · Node.js · PostgreSQL · Redis · Leaflet.js · IBM Carbon Design System

[![Built with IBM Bob](https://img.shields.io/badge/Built%20with-IBM%20Bob-8a3ffc?style=flat-square)](BOB_STORY.md)
[![Theme: Smarter Streets](https://img.shields.io/badge/Theme-Smarter%20Streets%20Better%20Living-0f62fe?style=flat-square)](SUBMISSION.md)
[![Responsible AI](https://img.shields.io/badge/Governance-Responsible%20AI%20Charter-24a148?style=flat-square)](.bob/artifacts/oorushare-responsible-ai-principles.html)

---

## IBM Bobathon Submission Links

- [**Official Hackathon Submission Document (SUBMISSION.md)**](SUBMISSION.md) — The Problem, Prototype, Bob Story & Measurable Outcomes
- [**Master Deliverables Index (DELIVERABLES_INDEX.md)**](DELIVERABLES_INDEX.md) — Verification checklist mapping all 5 participation requirements
- [**Low-Level Design (LLD)**](lld.md) — Database schemas, API contracts, sequence diagrams, and locking mechanics
- [**High-Level Design (HLD)**](hld.md) — System architecture, asymmetric onboarding, and DPDP Act 2023 governance
- [**The Bob Story (BOB_STORY.md)**](BOB_STORY.md) — Detailed narrative of how IBM Bob architected and accelerated OoruShare
- [**Responsible AI Charter (RAI-001)**](oorushare-responsible-ai-principles.html) — Pre-code governance, privacy & fairness architecture
- **1-Click Judge Tour:** Click the **"Run 30s Agent Tour"** button in any dashboard header to execute the live autonomous agentic loop!

---

## The Problem

Narrow bylanes in Indiranagar, HSR Layout, and Koramangala have **zero loading bays**.
Cloud kitchens + dark stores + gig delivery = daily war with RWAs over blocked driveways.

Bengaluru processes **2M+ quick-commerce deliveries per day** — with 0 dedicated loading infrastructure.

---

## The Solution

OoruShare coordinates three actors who were never connected before:

| Role | What they do |
|------|-------------|
| **Resident** | List driveway availability windows → earn community credits per booking |
| **Rider** | See live legal loading spots on map → book a 2-min slot before arriving |
| **Dark Store** | Stagger rider dispatch based on real-time street capacity → no curb gridlock |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Plain HTML + CSS + Leaflet.js — no build step, zero JS framework overhead |
| Backend | Node.js + Express · 5 routers · SSE live stream endpoint |
| Database | PostgreSQL (Docker) · In-memory fallback — runs without DB out of the box |
| Maps | Leaflet.js + OpenStreetMap tiles · Live colour-coded spot markers |
| Live Updates | Server-Sent Events (SSE) · Spots + queue pushed every 3 seconds |
| Deploy | Docker Compose · 3-service stack · 1-command startup |

---

## Quick Start

### Option A — Docker (full stack with PostgreSQL)

```bash
# 1. Copy env file
cp .env.example .env

# 2. Start all three services
docker-compose up

# 3. Open in browser
open http://localhost:8081
```

### Option B — No Docker (in-memory, zero setup)

```bash
cd backend
npm install
PORT=3001 node server.js
```

Then open the HTML files directly in any browser (no server required for the frontend):
- [`frontend/index.html`](frontend/index.html) — Resident Dashboard
- [`frontend/rider.html`](frontend/rider.html) — Rider Spatial Radar
- [`frontend/darkstore.html`](frontend/darkstore.html) — Dark Store Dispatch Co-pilot
- [`frontend/rwa.html`](frontend/rwa.html) — RWA Admin Dashboard

> **Note:** The frontend JS files reference `http://localhost:3001` as the API base.
> If you change the backend port, update `const API = '...'` in each `frontend/js/*.js` file.

---

## URLs

| Page | Docker | No-Docker |
|------|--------|-----------|
| Resident Dashboard | http://localhost:8081 | Open `frontend/index.html` directly |
| Rider Spatial Radar | http://localhost:8081/rider.html | Open `frontend/rider.html` directly |
| Dark Store Co-pilot | http://localhost:8081/darkstore.html | Open `frontend/darkstore.html` directly |
| RWA Admin | http://localhost:8081/rwa.html | Open `frontend/rwa.html` directly |
| Backend health | http://localhost:3001/health | http://localhost:3001/health |

---

## Project Structure

```
oorushare/
├── backend/
│   ├── server.js               # Express entry point — mounts all routers
│   ├── routes/
│   │   ├── spots.js            # Driveway spot CRUD (GET, POST, PATCH status)
│   │   ├── bookings.js         # Rider 2-min slot bookings (GET, POST, DELETE)
│   │   ├── queue.js            # Dark store dispatch queue (GET, POST, PATCH, stats)
│   │   ├── credits.js          # Community credit ledger (GET, summary)
│   │   └── rwa.js              # RWA admin: approve/reject spot listings
│   ├── middleware/
│   │   └── validate.js         # Reusable validation middleware factories
│   ├── db/
│   │   ├── schema.sql          # PostgreSQL DDL (idempotent via IF NOT EXISTS)
│   │   ├── migrate.js          # Pool selector: PostgreSQL or in-memory fallback
│   │   ├── memdb.js            # In-memory pg.Pool drop-in — no DB required
│   │   └── seed.js             # Demo seed: 8 spots, 7 queue entries, 3 credits
│   └── Dockerfile
├── frontend/
│   ├── index.html              # Resident Dashboard
│   ├── rider.html              # Rider Spatial Radar (Leaflet map + SSE)
│   ├── darkstore.html          # Dark Store Dispatch Co-pilot
│   ├── rwa.html                # RWA Admin Dashboard
│   ├── css/
│   │   └── app.css             # IBM Carbon palette, shared styles
│   ├── js/
│   │   ├── resident.js         # Resident dashboard JS (localStorage, geolocation)
│   │   ├── rider.js            # Rider map JS (Leaflet, SSE, bookings)
│   │   ├── darkstore.js        # Dark store JS (countdowns, surge simulation)
│   │   └── rwa.js              # RWA admin JS (approve/reject, stats)
│   └── Dockerfile              # nginx:alpine — serves static files
├── docker-compose.yml          # db + backend + frontend services
├── .env.example                # Environment variable template
└── README.md
```

---

## API Reference

All endpoints return JSON. Base URL: `http://localhost:3001`

### Spots — `/spots`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/spots` | List spots. Query: `neighborhood`, `status`, `owner_name` |
| `GET` | `/spots/:id` | Get a single spot |
| `POST` | `/spots` | Create a spot. Body: `owner_name`, `address`, `lat`, `lng`, `neighborhood`, `gate_width_m`, `available_from`, `available_to` |
| `PATCH` | `/spots/:id/status` | Toggle status. Body: `{ "status": "available" \| "booked" \| "unavailable" }` |

### Bookings — `/bookings`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/bookings` | List bookings. Query: `spot_id` |
| `POST` | `/bookings` | Book a slot. Body: `spot_id`, `rider_name`, `platform`, `rider_phone`, `duration_mins` |
| `DELETE` | `/bookings/:id` | Cancel a booking (frees the spot immediately) |

### Dispatch Queue — `/queue`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/queue` | List queue entries. Query: `store_name`, `neighborhood`, `status` |
| `GET` | `/queue/stats` | Congestion summary: `[{ neighborhood, pending, dispatched, completed }]` |
| `POST` | `/queue` | Add rider to queue. Body: `store_name`, `rider_name`, `neighborhood`, `platform`, `stagger_mins` |
| `PATCH` | `/queue/:id/dispatch` | Mark rider as dispatched |

### Credits — `/credits`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/credits` | Credit history. Query: `owner_name` |
| `GET` | `/credits/summary` | Total credits per resident: `[{ owner_name, total_credits, share_count, neighborhood }]` |

### RWA Admin — `/rwa`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/rwa/spots` | All spots with RWA review status. Query: `rwa_status`, `neighborhood` |
| `GET` | `/rwa/stats` | Spot counts per `rwa_status`: `[{ rwa_status, count }]` |
| `PATCH` | `/rwa/spots/:id/approve` | Approve a spot — makes it visible to riders |
| `PATCH` | `/rwa/spots/:id/reject` | Reject a spot — hides it from the rider map |

### Live Stream — `/live`

Server-Sent Events endpoint. Pushes `{ spots, queue }` every 3 seconds.
Subscribe with `new EventSource('http://localhost:3001/live')`.

### Health — `/health`

```json
{ "status": "ok", "app": "OoruShare" }
```

---

## Data Model

```
spots
  id · owner_name · address · neighborhood · lat · lng
  gate_width_m · status · rwa_status · available_from · available_to · created_at

bookings
  id · spot_id → spots · rider_name · rider_phone · platform
  duration_mins · status · booked_at

dispatch_queue
  id · store_name · neighborhood · rider_name · platform
  scheduled_at · status · spot_id → spots · created_at

credits
  id · owner_name · spot_id → spots · booking_id → bookings
  credits · reason · created_at
```

All FK constraints enforced · `IF NOT EXISTS` schema · In-memory mock mirrors exact `pg.Pool` interface.

---

## Demo Data (seeded on startup)

- **8 spots** across HSR Layout, Indiranagar, and Koramangala
- **4 dispatch queue entries** staggered from startup time
- **3 resident credit histories** (welcome bonus)

---

## Scaling to 1 Million Users

OoruShare is architected to scale horizontally to 1M+ users without rewriting any application logic. All scaling changes are in configuration and infrastructure.

### Bottlenecks addressed

| Bottleneck | Before | After |
|---|---|---|
| SSE DB load | O(clients × 2 queries / 3 s) | O(2 queries / 3 s) via Redis pub/sub fan-out |
| Booking races | check-then-set (racy) | PostgreSQL advisory lock inside a transaction |
| DB connections | 10 (pg default) | Configurable `POOL_MAX` + PgBouncer in front |
| Runaway queries | None | `statement_timeout` set per connection |
| Abuse / bots | None | Rate limiting: 300 req/min API, 10 req/min bookings |
| Response size | Uncompressed JSON | gzip / brotli via `compression` middleware |
| Observability | `console.log` | Structured JSON logs with `X-Request-Id` correlation |
| Process crash | In-flight requests lost | Graceful shutdown: drains SSE + waits for connections |
| Single CPU | Single-threaded Node | `NODE_CLUSTER=1` forks one worker per CPU core |
| Single instance | One backend container | `docker compose up --scale backend=N` + Redis |

### How to scale (horizontal)

```bash
# Start full stack with 4 backend replicas
docker compose up --scale backend=4

# Tune per environment
POOL_MAX=5            # keep low per process when PgBouncer is in transaction mode
SSE_INTERVAL_MS=5000  # relax push frequency under heavy read load
RATE_API_MAX=500      # raise for trusted internal services
```

### How to scale (vertical — one large machine)

```bash
# Forks one worker per CPU core
NODE_CLUSTER=1 node server.js
```

### Capacity estimates (back-of-envelope)

| Tier | Setup | Est. concurrent SSE clients |
|------|-------|---|
| Dev | 1 Node, no Redis | ~1,000 (in-process emitter) |
| Small | 4 replicas + Redis | ~50,000 |
| Medium | 16 replicas + Redis Cluster | ~200,000 |
| Large | 64 replicas + Redis Cluster + CDN edge SSE | ~1,000,000+ |

> Key insight: the Redis fan-out means adding replicas does **not** increase DB query rate.
> 64 replicas still issue exactly **2 DB queries every 3 seconds** for SSE, regardless of
> how many clients are connected across all of them.

### New files added for scaling

| File | Purpose |
|------|---------|
| [`backend/db/redis.js`](backend/db/redis.js) | ioredis pub/sub clients; in-process EventEmitter fallback |
| [`backend/middleware/rateLimit.js`](backend/middleware/rateLimit.js) | API + booking rate limiters |
| [`backend/middleware/requestId.js`](backend/middleware/requestId.js) | Correlation ID + structured logger on every request |

---

## What's Next

- WhatsApp OTP login for residents — no app install required
- UPI credit redemption — community credits -> maintenance fund contributions
- Platform API integration — Blinkit / Zepto dispatch webhooks for auto-staggering
- City-level congestion heatmap — aggregate anonymised curb-usage data
