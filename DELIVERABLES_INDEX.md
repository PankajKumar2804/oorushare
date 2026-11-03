# OoruShare: Master Submission & Deliverables Index

**IBM Bobathon: Build for Bengaluru** — Theme 1: *Smarter Streets Better Living*  
**Built with IBM Bob** · Bengaluru Civic Pilot

---

## 1. Submission Deliverables Checklist

Per official IBM Bobathon submission criteria, this archive contains the following mandatory deliverables:

| Deliverable Requirement | File / Resource Location | Status |
|---|---|---|
| **1. Problem Statement & Detailed Solution** | [`SUBMISSION.md`](SUBMISSION.md), [`hld.md`](hld.md), [`lld.md`](lld.md) | Verified & Documented |
| **2. Working Prototype built with IBM Bob** | Complete `backend/` and `frontend/` (Node.js, Express, Carbon v11, ESRI GIS) | Operational (`http://localhost:3001`) |
| **3. Source Code Repository** | Bundled root codebase (`backend/`, `frontend/`, `docker-compose.yml`) | Ready for local run & Git push |
| **4. Presentation Deck / Document** | [`OoruShare_IBM_Bobathon_Theme1_Submission.pptx`](OoruShare_IBM_Bobathon_Theme1_Submission.pptx) | 10 Slides, Carbon v11, Embedded Bob Mascot |
| **5. Video Demonstration & Walkthrough** | [`VIDEO_SCRIPT.md`](VIDEO_SCRIPT.md) (Complete scene-by-scene script) & YouTube Link | Documented with exact screen actions |

---

## 2. Key Architectural Disclosures: Synthetic Demo Data vs Real-Time BAA Federation

> [!IMPORTANT]
> **Data Disclosure for Judges & Evaluators:**
> - **Current Prototype Data (Synthetic Baseline):** All driveway addresses, rider names, GPS coordinates, and historical bookings currently populated in `memdb.js` and `seed.js` are **synthetic, privacy-safe mock data** representing high-density Bengaluru corridors (HSR Layout Sector 1, Indiranagar 100 Feet Road, Koramangala 80 Feet Road).
> - **Production Transition (Real-Time BAA Federation):** In live city deployment, rider identities and drop destinations are **not entered manually**. Instead, under formal **Business Associate Agreements (BAA)** with delivery partners (Blinkit, Zepto, Swiggy Instamart), active dispatches, shift rosters, and curb allocations stream **in real time via enterprise webhooks** (`POST /integrations/dispatch`). 
> - **DPDP Act 2023 Compliance:** Live data is tokenized on-the-fly (`rider_token: "BLK_HSR_4021"`, masked vehicle numbers `KA01***39`), preventing any PII exposure.

---

## 3. Directory Navigation

- **Core Documentation**:
  - [`SUBMISSION.md`](SUBMISSION.md): Official hackathon answers matching all 5 evaluation criteria.
  - [`BOB_STORY.md`](BOB_STORY.md): Complete narrative of how IBM Bob co-architected and accelerated OoruShare.
  - [`hld.md`](hld.md): High-Level Design document covering system architecture, asymmetric onboarding, and DPDP governance.
  - [`lld.md`](lld.md): Low-Level Design document covering schemas, API contracts, PostgreSQL advisory locks, and sequence diagrams.
  - [`VIDEO_SCRIPT.md`](VIDEO_SCRIPT.md): Step-by-step 3-minute video recording walkthrough script.
  - [`oorushare-responsible-ai-principles.html`](oorushare-responsible-ai-principles.html): Responsible AI Charter (RAI-001).

- **Executable Prototype**:
  - `backend/`: Node.js Express server, dual-mode database (`memdb.js` / PostgreSQL), Redis pub/sub SSE, and agentic routes.
  - `frontend/`: IBM Carbon Design System v11 UI, ESRI World Street Map radar, and 4 persona dashboards.
  - `docker-compose.yml`: Production container stack with PostgreSQL, PgBouncer, Redis, Backend, and Nginx.

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

