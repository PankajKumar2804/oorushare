# OoruShare — Bengaluru Civic Curb Network

> **IBM Bobathon: Build for Bengaluru** — Theme 1: *Smarter Streets Better Living*
> *Turning 2 metres of Bengaluru curb space into a shared community asset.*
> **Built with IBM Bob** · Node.js · PostgreSQL · Redis · Leaflet.js · IBM Carbon Design System v11

**Builder & Idea Originator:** [Pankaj Kumar (Pankajkr Jain)](https://github.com/PankajKumar2804) · SWE AI Full Stack · Healthcare Industry
**Co-Pilot:** IBM Bob · Autonomous Principal Architect

[![Built with IBM Bob](https://img.shields.io/badge/Built%20with-IBM%20Bob-8a3ffc?style=flat-square)](BOB_STORY.md)
[![Theme: Smarter Streets](https://img.shields.io/badge/Theme-Smarter%20Streets%20Better%20Living-0f62fe?style=flat-square)](SUBMISSION.md)
[![Responsible AI](https://img.shields.io/badge/Governance-Responsible%20AI%20Charter-24a148?style=flat-square)](oorushare-responsible-ai-principles.html)

---

## IBM Bobathon Submission Links

- [**Official Hackathon Submission (SUBMISSION.md)**](SUBMISSION.md) — Problem, Prototype, Bob Story & Measurable Outcomes
- [**Master Deliverables Index (DELIVERABLES_INDEX.md)**](DELIVERABLES_INDEX.md) — Verification checklist for all 5 participation requirements
- [**Low-Level Design (lld.md)**](lld.md) — Database schemas, API contracts, sequence diagrams, and locking mechanics
- [**High-Level Design (hld.md)**](hld.md) — System architecture, asymmetric onboarding, and DPDP Act 2023 governance
- [**The Bob Story (BOB_STORY.md)**](BOB_STORY.md) — Detailed narrative of how IBM Bob architected and accelerated OoruShare
- [**Responsible AI Charter (RAI-001)**](oorushare-responsible-ai-principles.html) — Pre-code governance, privacy & fairness architecture
- [**Video Walkthrough Script (VIDEO_SCRIPT.md)**](VIDEO_SCRIPT.md) — Scene-by-scene recording guide
- **1-Click Judge Tour:** Click **"Run 30s Agent Tour"** in any dashboard header to execute the live autonomous agentic loop!

---

## The Problem — The Last 10 Metres

Blinkit, Zepto, and Swiggy have solved the warehouse end. Their dark stores have loading docks, their riders have routing. **But there is one piece nobody has solved: the last 10 metres.**

The 2-minute stop at the customer's residential gate — on a 30-foot bylane that has zero legal loading infrastructure and structurally never can (BBMP minimum for commercial loading zones is 40 ft).

Bengaluru processes **2.5 million quick-commerce deliveries per day** with **0 dedicated residential loading infrastructure**:
- Riders double-park across private gates → **88% of RWA disputes** cite delivery obstruction
- No legal stop = **₹1,500/month** in wrongful BTP towing fines per rider
- Choked bylanes = **140,000 transit hours lost daily** citywide

**Why no single platform solves this:** Any residential loading bay serves Blinkit, Zepto, Swiggy, and Dunzo equally. No platform will fund shared infrastructure that benefits competitors. Only a neutral civic layer can.

---

## The Solution: 4 Live Dashboards + Autonomous Agentic Curb Governor

OoruShare connects four stakeholders who were never coordinated before:

| Role | Dashboard | Core Capability |
|------|-----------|-----------------|
| **Resident** | `resident.html` | List driveway slots · Earn +10 credits/drop · Redeem ₹50 RWA maintenance offset |
| **Rider** | `rider.html` | Receives pre-allocated bay from dark store dispatch engine via BAA · Spatial radar as fallback for new/cross-zone riders · Auto-reroute if blocked |
| **Dark Store** | `darkstore.html` | **Primary OoruShare customer** · Stagger dispatches via IBM Granite 3.8B forecast · Pre-allocate bays before riders leave · Prevent bylane clustering |
| **RWA Admin** | `rwa.html` | Approve/reject listings · Audit gate widths · Settle credit ledger |

The root `/` (`index.html`) is the **civic landing page** — the agent loop, impact metrics, and prototype hub.

---

## Quick Start (No Docker Required)

```bash
cd backend
npm install
node server.js
```

Open in browser:
- **Civic Overview & Agent Tour:** `http://localhost:3001/`
- **Resident Dashboard:** `http://localhost:3001/resident.html`
- **Rider Spatial Radar:** `http://localhost:3001/rider.html`
- **Dark Store Co-pilot:** `http://localhost:3001/darkstore.html`
- **RWA Admin Console:** `http://localhost:3001/rwa.html`

> No database setup needed. `memdb.js` seeds **24 spots · 18 residents · 20 bookings · 14 queue entries · 8 redemptions** on startup.

---

## Docker Stack (Full Production)

```bash
docker compose up
```
Open `http://localhost:8081`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML · CSS (IBM Carbon v11) · Vanilla JS · Leaflet.js |
| Backend | Node.js · Express · 6 route modules |
| Database | PostgreSQL (Docker) **or** in-memory `memdb.js` — zero setup |
| Maps | Leaflet.js · ESRI World Street Map · live zone heatmap circles |
| Live Updates | Server-Sent Events (SSE) · spots + queue pushed every 3s |
| AI Layer | Agentic 4-phase governor · IBM Granite 3.8B congestion forecast |
| Deploy | Docker Compose · Nginx reverse proxy · PgBouncer · Redis pub/sub |

---

## API Reference

All endpoints return JSON. Base URL: `http://localhost:3001`

### Spots — `/spots`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/spots` | List approved spots. Query: `neighborhood`, `status`, `owner_name` |
| `POST` | `/spots` | Create a spot |
| `PATCH` | `/spots/:id/status` | Toggle availability |

### Bookings — `/bookings`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/bookings` | List bookings |
| `POST` | `/bookings` | Book a 2-min slot |
| `POST` | `/bookings/:id/report-blocked` | Flag bay blocked → auto-reroute |

### Dispatch Queue — `/queue`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/queue` | List queue entries |
| `GET` | `/queue/stats` | Congestion summary by neighbourhood |
| `GET` | `/queue/forecast` | IBM Granite 3.8B stagger advisory |
| `POST` | `/queue` | Add rider to queue |
| `PATCH` | `/queue/:id/dispatch` | Mark dispatched |

### Credits — `/credits`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/credits` | Credit history. Query: `owner_name` |
| `GET` | `/credits/summary` | Net credits per resident (minus redemptions) |
| `POST` | `/credits/redeem` | Redeem credits for ₹50 RWA maintenance offset |
| `GET` | `/credits/redemptions` | Redemption ledger |

### RWA Admin — `/rwa`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/rwa/spots` | All spots with review status |
| `GET` | `/rwa/stats` | Counts per `rwa_status` |
| `PATCH` | `/rwa/spots/:id/approve` | Approve → visible on rider map |
| `PATCH` | `/rwa/spots/:id/reject` | Reject → hidden from map |

### Agentic AI — `/agent`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/agent/activity` | Live agent thought stream + zone saturation |
| `GET` | `/agent/impact` | Civic telemetry (CO₂, time saved, fines averted) |
| `POST` | `/agent/tour` | 1-click judge tour — full autonomous allocation cycle |

### Live Stream — `/live`
Server-Sent Events. Pushes `{ spots, queue }` every 3s. Subscribe with `new EventSource('/live')`.

---

## Seed Data (auto-loaded on startup, no setup needed)

| Entity | Count | Detail |
|--------|-------|--------|
| Spots | 24 | 18 approved · 4 pending · 2 rejected across HSR / Indiranagar / Koramangala |
| Residents | 18 | Real Bengaluru street addresses, verified GPS coordinates |
| Queue entries | 14 | Mix of pending + dispatched across 4 dark stores |
| Bookings | 20 | Completed drops across all 18 spots and 4 platforms |
| Credit entries | 39 | Earning history for all 18 residents |
| Redemptions | 8 | 6 approved + 2 pending RWA maintenance offsets |

---

## Project Structure

```
oorushare/
├── backend/
│   ├── server.js              # Express entry point, port 3001
│   ├── routes/
│   │   ├── agent.js           # Agentic AI governor: activity, impact, tour
│   │   ├── spots.js           # Driveway CRUD
│   │   ├── bookings.js        # 2-min slot reservations + blocked-bay reroute
│   │   ├── queue.js           # Dark store dispatch queue + Granite forecast
│   │   ├── credits.js         # Community credit ledger + redemptions
│   │   ├── rwa.js             # RWA approve/reject + stats
│   │   └── integrations.js    # BAA webhook intake (POST /integrations/dispatch)
│   └── db/
│       ├── memdb.js           # In-memory pg.Pool drop-in (no DB needed)
│       ├── migrate.js         # Pool selector: PostgreSQL or memdb
│       └── schema.sql         # PostgreSQL DDL
├── frontend/
│   ├── index.html             # Civic landing page + agent loop + prototype hub
│   ├── resident.html          # Resident dashboard
│   ├── rider.html             # Rider spatial radar (Leaflet + ESRI + zone heatmap)
│   ├── darkstore.html         # Dark store dispatch co-pilot
│   ├── rwa.html               # RWA admin console
│   ├── css/app.css            # IBM Carbon v11 design tokens
│   └── js/
│       ├── shared.js          # Tour modal, telemetry, animated phase stepper
│       ├── resident.js        # Resident dashboard + switcher dropdown
│       ├── rider.js           # Leaflet map, SSE, booking, zone heatmap circles
│       ├── darkstore.js       # Queue countdowns, surge sim, Granite advisory
│       └── rwa.js             # Approve/reject, stats, redemptions ledger
├── SUBMISSION.md              # Official hackathon submission document
├── DELIVERABLES_INDEX.md      # Checklist of all 5 participation requirements
├── hld.md                     # High-Level Design
├── lld.md                     # Low-Level Design
├── BOB_STORY.md               # IBM Bob co-engineering narrative
├── VIDEO_SCRIPT.md            # Scene-by-scene recording guide
├── OoruShare_IBM_Bobathon_Theme1_Submission.pptx
└── docker-compose.yml         # Full production stack
```

---

## What's Next: Strategic Roadmap

| Phase | Timeframe | Goal |
|---|---|---|
| **Phase 0** | Now → 3 months | Prove supply side — single-society pilot, ≥40% resident listing conversion |
| **Phase 1** | 3 → 9 months | First BAA — one dark store operator, 500+ live dispatches |
| **Phase 2** | 9 → 18 months | Civic infrastructure status — RWA MoUs, ONDC alignment, BBMP data partnership |
| **Phase 3** | 18 → 36 months | 50+ corridors citywide OR strategic acquisition on neutral terms |

**Near-term product:**
- WhatsApp OTP listing — reduces friction, increases Phase 0 conversion
- Direct UPI credit payout — turns maintenance offset into real cash, doubles retention
- Single dark store BAA pilot — first live dispatch data
- BBMP ward-level congestion heatmap — anchors civic data revenue stream

> Full strategic rationale in [`SUBMISSION.md §8`](SUBMISSION.md) and [`hld.md §9–10`](hld.md).
