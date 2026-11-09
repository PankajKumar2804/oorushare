# OoruShare: Master Submission & Deliverables Index

**IBM Bobathon: Build for Bengaluru** — Theme 1: *Smarter Streets Better Living*

---

### Builder & Idea Originator

**Pankajkr Jain (Pankaj Kumar)**
SWE AI Full Stack · Healthcare Industry
*Conceived, designed, and built OoruShare end-to-end — from the original civic problem statement and product architecture through every line of backend, frontend, and agentic AI code.*

**IBM Bob** — Execution leverage tool · Multiplied Pankajkr Jain's output across all 5 SDLC phases
*Co-architected concurrency design, Responsible AI charter, agentic governor, Carbon v11 interfaces, and containerisation.*

---

**Built with IBM Bob** · Bengaluru Civic Pilot

---

## 1. Submission Deliverables Checklist

Per official IBM Bobathon submission criteria, this archive contains the following mandatory deliverables:

| Deliverable Requirement | File / Resource Location | Status |
|---|---|---|
| **1. Problem Statement & Detailed Solution** | [`SUBMISSION.md`](SUBMISSION.md), [`hld.md`](hld.md), [`lld.md`](lld.md) | ✅ Verified & Documented |
| **2. Working Prototype built with IBM Bob** | `backend/` + `frontend/` — 4 dashboards + civic landing, Node.js, Carbon v11, ESRI GIS | ✅ Operational at `http://localhost:3001` · 24 spots · 18 residents · live agent |
| **3. Source Code Repository** | [https://github.com/PankajKumar2804/oorushare](https://github.com/PankajKumar2804/oorushare) | ✅ Public & Active |
| **4. Presentation Deck** | [`OoruShare_IBM_Bobathon_Theme1_Submission.pptx`](OoruShare_IBM_Bobathon_Theme1_Submission.pptx) | ✅ IBM Plex Sans font, Carbon v11, IBM Bob mascot |
| **5. Video Demonstration** | [https://youtu.be/lTbdyv2hhck](https://youtu.be/lTbdyv2hhck) — 6-scene walkthrough, all dashboards covered | ✅ Published on YouTube |
| **6. Market Gap & Competitive Analysis** | [`SUBMISSION.md §1`](SUBMISSION.md) — Last-10-Metres gap, why platforms won't build this | ✅ Added — Platform neutrality argument documented |
| **7. Strategic Roadmap** | [`SUBMISSION.md §8`](SUBMISSION.md), [`hld.md §9–10`](hld.md) — 4-phase plan, defensibility scenarios | ✅ Added — Phase 0 → 3 execution plan |
| **8. Responsible AI Charter** | [`oorushare-responsible-ai-principles.html`](oorushare-responsible-ai-principles.html) — RAI-001 v1.0 | ✅ Pre-code governance, DPDP 2023, fairness framework |

---

## 2. Key Architectural Disclosures: Synthetic Demo Data vs Real-Time BAA Federation

> [!IMPORTANT]
> **Data Disclosure for Judges & Evaluators:**
> - **Current Prototype Data (Synthetic Baseline):** All driveway addresses, rider names, GPS coordinates, and historical bookings currently populated in `memdb.js` are **synthetic, privacy-safe mock data** representing high-density Bengaluru corridors (HSR Layout Sector 1, Indiranagar 100 Feet Road, Koramangala 80 Feet Road). 24 spots across 18 residents, with verified GPS coordinates.
> - **Production Transition (Real-Time BAA Federation):** In live city deployment, rider identities and drop destinations are **not entered manually**. Instead, under formal **Business Associate Agreements (BAA)** with delivery partners (Blinkit, Zepto, Swiggy Instamart), active dispatches, shift rosters, and curb allocations stream **in real time via enterprise webhooks** (`POST /integrations/dispatch`). 
> - **DPDP Act 2023 Compliance:** Live data is tokenized on-the-fly (`rider_token: "BLK_HSR_4021"`, masked vehicle numbers `KA01***39`), preventing any PII exposure.

---

## 3. Directory Navigation

- **Core Documentation**:
  - [`SUBMISSION.md`](SUBMISSION.md): Official hackathon answers matching all 5 evaluation criteria.
  - [`BOB_STORY.md`](BOB_STORY.md): Complete narrative of how IBM Bob co-architected and accelerated OoruShare.
  - [`hld.md`](hld.md): High-Level Design — system architecture, asymmetric onboarding, DPDP governance.
  - [`lld.md`](lld.md): Low-Level Design — schemas, API contracts, PostgreSQL advisory locks, sequence diagrams.
  - [`VIDEO_SCRIPT.md`](VIDEO_SCRIPT.md): 6-scene recording guide covering all dashboards, heatmap, agent tour, resident switcher.
  - [`oorushare-responsible-ai-principles.html`](oorushare-responsible-ai-principles.html): Responsible AI Charter (RAI-001).
  - [`OoruShare_IBM_Bobathon_Theme1_Submission.pptx`](OoruShare_IBM_Bobathon_Theme1_Submission.pptx): 10-slide deck in IBM Plex Sans / Carbon v11.

- **Executable Prototype**:
  - `backend/`: Node.js Express, 6 route modules, dual-mode db (`memdb.js` / PostgreSQL), Redis SSE, agentic routes.
  - `frontend/`: IBM Carbon v11 UI, ESRI World Street Map + zone heatmap, 4 dashboards + civic landing, resident switcher.
  - `docker-compose.yml`: Full production stack — PostgreSQL, PgBouncer, Redis, Backend, Nginx.

---

## 4. How to Run Locally

```bash
cd backend
npm install
node server.js
```
Then visit:
- **Flagship Landing**: `http://localhost:3001/`
- **Rider Spatial Radar**: `http://localhost:3001/rider.html`
- **Resident Portal**: `http://localhost:3001/resident.html`
- **Dark Store Dispatch Co-pilot**: `http://localhost:3001/darkstore.html`
- **RWA Admin Console**: `http://localhost:3001/rwa.html`
- **1-Click Judge Tour**: Click `"Run 30s Agent Tour"` in any navbar!

