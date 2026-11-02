# High-Level Design (HLD): OoruShare Civic Landing & Marketing Experience

## 1. Executive Summary & Purpose

**OoruShare** was engineered for the **IBM Bobathon: Build for Bengaluru** under **Theme 1: Smarter Streets Better Living**. 

Currently, the root web route (`/` or `index.html`) immediately renders the raw **Resident Dashboard CRUD interface**. While functionally complete, this creates a major evaluation friction for hackathon judges, municipal authorities, and citizens:
- **No Conceptual Context**: Evaluators are dropped into a driveway listing form without understanding *why* this solves Bengaluru's bylane gridlock.
- **Hidden Agentic AI Capabilities**: The 4-stage autonomous curb loop, IBM Granite 3.8B congestion forecasting, and dual-layer conflict resolution are buried across separate pages.
- **Lost ESG & Civic Story**: The 4.2-minute transit delay reduction, 14.8 kg CO₂ abatement, and ₹1,500/month fine savings are not highlighted up-front.

### Goal
Decouple the operational dashboard from the marketing and narrative layer by creating a **world-class, high-craft Civic Marketing & Platform Overview Page** at root `/` (`index.html`), while preserving full, seamless access to the operational dashboards (`resident.html`, `rider.html`, `darkstore.html`, `rwa.html`).

---

## 2. Trade-Off Analysis

| Architectural Approach | Pros | Cons | Recommendation |
| :--- | :--- | :--- | :--- |
| **Option A: Replace `index.html` with Landing Page; Move Resident to `resident.html`** | • Standard web architecture (`/` = landing, `/resident` = portal)<br>• Instant first impression for judges & citizens<br>• Clean separation of storytelling and operations | • Requires updating internal navigation links across 4 dashboard pages | **Architect Recommendation (Recommended)**: Follows industry standards; provides maximum narrative impact for judging. |
| **Option B: Keep `index.html` as Resident Dashboard; Add `landing.html` or `about.html`** | • Zero changes to existing file paths | • Evaluators landing on `localhost:3001` still see a bare CRUD form<br>• Requires judges to manually click "About" | **Rejected**: Fails to capture judges during their initial 30-second first impression. |

---

## 3. Visual & Aesthetic Architecture (Zero AI Slop)

Adheres strictly to **IBM Carbon Design System v11** and **Refero Design** standards:
- **Typography**: IBM Plex Sans (Body, Headings) + IBM Plex Mono (Telemetry, Code, Timestamps).
- **Color Tokens**:
  - Slate/Carbon Dark: `#161616` (Header, Hero, Telemetry background)
  - Surface Pure: `#ffffff` (Cards, Panels)
  - Neutral Base: `#f4f4f4` (Background surface)
  - Accent Primary: `#0f62fe` (IBM Carbon Blue)
  - Civic Green: `#24a148` (Carbon Green for Available spots, Credits & ESG metrics)
  - Warning/Congestion: `#ff832b` (Carbon Orange for curb pressure)
- **Visual Structure**: Bento-grid layout, high information density, subtle border elevations (`1px solid #e0e0e0`), zero generic stock photos or marketing fluff.

---

## 4. Component & Section Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. GLOBAL HEADER: OoruShare Brand · Theme 1 Pill · Nav · [Run Simulation]│
├────────────────────────────────────────────────────────────────────────┤
│ 2. CIVIC TELEMETRY RIBBON (Live Poll: /agent/impact): CO₂ · Time · Fines│
├────────────────────────────────────────────────────────────────────────┤
│ 3. HERO SECTION                                                        │
│    - Impact Headline: "Unclogging Bengaluru's Bylanes"                 │
│    - Subtitle: Decentralized curb governor for 2.5M quick drops        │
│    - CTA Group: [Explore Live Prototypes] · [Run 30s Agent Simulation] │
│    - Real-Time Street Telemetry Counter Card                           │
├────────────────────────────────────────────────────────────────────────┤
│ 4. THE BENGALURU CRISIS (The "Why")                                    │
│    - 3-Way Gridlock: Residents vs. Gig Delivery Riders vs. BTP/RWAs     │
│    - The 30ft Bylane Bottleneck in HSR, Indiranagar, Koramangala       │
├────────────────────────────────────────────────────────────────────────┤
│ 5. THE 3-SIDED CIVIC CURB NETWORK (Bento Grid)                         │
│    - Box 1: Verified Driveway Sharing (+10 Credits/drop)               │
│    - Box 2: Rider Spatial Radar (2-min legal bays, zero fines)         │
│    - Box 3: Dark Store Staggered Dispatch (Granite 3.8B throttle)       │
│    - Box 4: RWA Bylane Governance & Maintenance Offset                 │
├────────────────────────────────────────────────────────────────────────┤
│ 6. THE AGENTIC AI CORE (Built with IBM Bob)                            │
│    - 4-Phase Perpetual Control Loop:                                   │
│      [Perception] → [Reasoning] → [Action] → [Reflection]              │
│    - watsonx.governance fairness, dispute logs, audit trace             │
├────────────────────────────────────────────────────────────────────────┤
│ 7. INTERACTIVE PROTOTYPE LAUNCHER (4 Persona Cards)                    │
│    - [Launch Resident Portal]    [Launch Rider Radar (Live Map)]       │
│    - [Launch Dark Store Engine]  [Launch RWA Admin Panel]              │
├────────────────────────────────────────────────────────────────────────┤
│ 8. VERIFIABLE CIVIC ROI & ESG IMPACT (TechGig Exit Criteria)           │
│    - 4.2 min/drop saved · 14.8 kg CO₂ abated · ₹12,500 fines averted   │
├────────────────────────────────────────────────────────────────────────┤
│ 9. FOOTER: IBM Bobathon Submission · Theme 1 · Open Architecture       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Flow & Live Backend Integration

The marketing page is not a static mockup; it dynamically hydrates from live backend endpoints:
1. `GET /agent/impact` $\to$ Updates live ESG metrics (Time saved, CO₂ abated, RWA dispute drop).
2. `GET /spots` $\to$ Shows real-time count of active Bengaluru driveways.
3. `POST /agent/tour` $\to$ Triggered via **"Run Simulation (Theme 1)"**, launching the modal audit trace.

---

## 6. Security, Performance & Browser Compatibility

- Zero external CDN dependencies for core styling (IBM Carbon tokens bundled in `app.css`).
- Fully responsive across mobile (delivery riders on phones) and 4K desktop (judges & dispatch monitors).
- Non-blocking asynchronous fetches with graceful fallback if the local daemon is rebooting.

