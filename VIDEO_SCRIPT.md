# OoruShare — Video Demonstration Script
> **IBM Bobathon: Build for Bengaluru · Theme 1: Smarter Streets Better Living**  
> **Target Duration:** 3–4 minutes  
> **Recording Tool:** IBM Webex screen recording  
> **Resolution:** 1920×1080 (1080p), 30fps · Microphone narration

---

## Pre-Recording Setup

```bash
cd backend
npm install
node server.js
```

**Before you hit record, confirm each item:**

- [ ] `http://localhost:3001/` loads — hero visible, live stats populated (18 Bays, 14.8 kg CO₂)
- [ ] Close DevTools (`F12`) — shifts layout in recordings
- [ ] Browser zoom at **100%** (`Ctrl+0`)
- [ ] Resident dashboard pre-loaded with **Priya Sharma** (default on first visit)
- [ ] Rider map shows **18 green pins** across HSR / Indiranagar / Koramangala with heatmap circles

---

## Scene-by-Scene Script

### Scene 1 · The Problem (0:00–0:35)

**Screen:** `http://localhost:3001/` — hero section visible

**Narration:**
> "Bengaluru processes 2.5 million quick-commerce deliveries every single day. But residential bylanes in HSR Layout, Indiranagar, and Koramangala have zero dedicated loading infrastructure. Delivery riders double-park across private gates — blocking residents, obstructing emergency vehicles, and racking up wrongful parking fines of fifteen hundred rupees a month per rider. OoruShare solves this by turning idle residential driveways into a cooperative network of authorized 2-minute loading bays."

**Actions:**
1. Slowly scroll through **Section 01 · The Ground Reality** — pause on the 3 problem cards (Resident Grievance, Gig Worker Penalty, City's Environmental Cost)
2. Let the live hero stats bar settle — point out: 4.2 min saved · 14.8 kg CO₂ · 18 Bays · ₹1,20,000 fines averted

---

### Scene 2 · The Architecture & Bob Story (0:35–1:10)

**Screen:** Scroll to **Section 02 · The 3-Sided Civic Curb Network** and **Section 03 · Autonomous AI Layer**

**Narration:**
> "OoruShare connects four civic stakeholders who were never coordinated before: residents who list driveways, riders who find legal spots, dark stores that stagger dispatches, and RWA admins who govern access. The entire system is powered by an autonomous agentic curb governor — architected end-to-end with IBM Bob. Bob designed the 4-phase perpetual control loop: Perception, Reasoning, Action, and Self-Correction, using IBM Granite 3.8B time-series forecasting to predict bylane saturation before it happens."

**Actions:**
1. Scroll through the Bento grid architecture cards — point out the 4 components (A through D)
2. Pause on the **Bob Story callout card** (Section 03) — point to IBM Bob mascot
3. Scroll to **Section 04 · Live Working Prototypes** — show the 4 persona cards

---

### Scene 3 · Live Prototype Walkthrough (1:10–2:35)

#### 3a. Resident Dashboard (1:10–1:30)

**Screen:** Click **"Resident"** in the nav → `http://localhost:3001/resident.html`

**Narration:**
> "The resident dashboard auto-loads with Priya Sharma's driveway data. She has one approved spot on 27th Main, HSR Layout, and has earned credits from multiple platform drops — Blinkit, Zepto, Swiggy, Dunzo. Each drop earns 10 community credits. To demo another resident, I'll use the 'View as Resident' switcher."

**Actions:**
1. Show **Priya Sharma** auto-loaded — 1 spot, credit history visible, credit banner showing balance
2. Switch to **Rajan Nair** using the dropdown — data refreshes instantly for Indiranagar
3. Point out the **Redeem 10 Credits (₹50 RWA Offset)** button

---

#### 3b. Rider Spatial Radar (1:30–1:55)

**Screen:** Click **"Rider Map"** → `http://localhost:3001/rider.html`

**Narration:**
> "Riders see a live spatial radar powered by the ESRI Enterprise World Street Map. The 18 green pulsing pins are available bays across all three zones. Notice the three dashed zone circles — these are live saturation heatmaps. Green means clear, amber means busy, red means the governor has throttled dispatch. I'll click a pin to book a 2-minute slot."

**Actions:**
1. Show map with **18 green pulsing pins** and **3 dashed zone circles**
2. Click the neighbourhood filter — zoom into HSR Layout, point out the zone circle colour
3. Click a green pin → show booking panel with address and gate width
4. Book the spot — marker turns red, "Spot booked for 2 minutes" toast appears

---

#### 3c. Dark Store Dispatch Co-pilot (1:55–2:15)

**Screen:** Click **"Dark Store"** → `http://localhost:3001/darkstore.html`

**Narration:**
> "Dark store managers use this staggering co-pilot. Instead of flooding a bylane with 6 riders at once, the IBM Granite 3.8B forecast recommends dynamic dispatch intervals. The live queue shows 14 riders across 4 dark stores — Blinkit HSR, Zepto Koramangala, Swiggy Indiranagar, Dunzo HSR. I'll hit Simulate Order Surge to add 5 more riders and watch the agent throttle automatically."

**Actions:**
1. Show **Live Congestion** stat tiles — HSR ~40%, Indiranagar ~33%, Koramangala ~40%
2. Show the live queue table with countdowns
3. Point to the **IBM Granite 3.8B Time-Series** badge and advisory text
4. Click **Simulate Order Surge (5 Riders)** — watch queue grow, saturation rise

---

#### 3d. RWA Governance Console (2:15–2:35)

**Screen:** Click **"RWA Admin"** → `http://localhost:3001/rwa.html`

**Narration:**
> "RWA administrators retain full democratic governance. No driveway goes live without committee approval. The stats show 18 approved, 4 pending review, 2 rejected. I'll approve a pending spot — it instantly appears on the rider map. Below, the community credit ledger shows 8 maintenance offsets settled, worth a total of ₹400 in bill reductions."

**Actions:**
1. Show summary cards — **Approved: 18 · Pending: 4 · Rejected: 2**
2. Filter to **Pending** — show the 4 awaiting-review listings
3. Click **Approve** on one listing — card updates to approved
4. Scroll down to **Society Maintenance Dues Offset** table — point to approved redemptions

---

### Scene 4 · Live City Telemetry (2:35–2:50)

**Screen:** Scroll back to `http://localhost:3001/` → Section 04, below the 4 persona cards

**Narration:**
> "Back on the landing page, below the 4 dashboards, you'll see the live city telemetry panel — real-time zone saturation percentages and the autonomous agent's live perception feed. This is the same data powering the heatmap circles on the rider map, updated every 8 seconds."

**Actions:**
1. Show the **Live Street Telemetry [LIVE]** panel
2. Point out the 3 zone saturation tiles with progress bars
3. Show the agent thought stream with PERCEPTION / REASONING / ACTION entries

---

### Scene 5 · Agent Simulation (2:50–3:25)

**Screen:** Click **"Run 30s Agent Tour"** in the header (any page)

**Narration:**
> "Let me run the full autonomous agent simulation. Watch as the system perceives an incoming delivery from a Blinkit dark store, reasons about bylane capacity using Granite forecasting, allocates the optimal bay to a different resident each time, and self-corrects if a conflict is detected. The entire loop executes in under 500 milliseconds."

**Actions:**
1. Click **"Run 30s Agent Tour"**
2. Show the animated 4-phase stepper completing: Perception → Reasoning → Action → Reflection, each with a green check
3. When result appears — point out: **Allocated Bay** (different neighbourhood each time), **Resident** (not always Priya), **+10 Credits awarded**
4. Point to the **Agent Decision Trace** text box — shows the autonomous reasoning
5. Point to the **Verified Outcome** bar: "4.2 minutes transit saved | 0.14 kg CO₂ abated | Zero driveway blockage"
6. Close modal · Click **Run 30s Agent Tour** again — confirm a **different resident and neighbourhood** this time

---

### Scene 6 · Closing & The Bob Story (3:25–3:50)

**Screen:** Scroll to the `http://localhost:3001/` Bob Story callout card and footer

**Narration:**
> "Every architectural decision in OoruShare was made with IBM Bob as the principal co-architect: the Responsible AI charter written before any code, the PostgreSQL advisory locking layer that eliminates double-bookings under concurrent load, the Redis pub/sub SSE fan-out that scales to 100,000 simultaneous riders at constant database cost, and the full Carbon v11 interface you see here. OoruShare is production-ready for citywide deployment. Built with IBM Bob. Built for Bengaluru."

**Actions:**
1. Show the **IBM Bob Story callout card** (Section 03) with the mascot
2. End on the footer: "Theme 1: Smarter Streets Better Living · Made with IBM Bob"

---

## Post-Recording Checklist

- [ ] Export as MP4, H.264, 1080p
- [ ] Filename: `OoruShare_IBM_Bobathon_Video_Demo.mp4`
- [ ] Verify total duration is under 5 minutes
- [ ] Upload to YouTube (unlisted) or IBM Box
- [ ] Paste video link into `SUBMISSION.md` Section 7 — replace the `*To be added*` placeholder
- [ ] Push final commit to GitHub with updated `SUBMISSION.md`
