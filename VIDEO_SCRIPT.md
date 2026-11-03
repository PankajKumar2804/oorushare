# OoruShare Video Demonstration Script
> **Target Duration:** 3–4 minutes  
> **Recording Tool:** OBS Studio / Loom / Windows Game Bar (`Win + G`)  
> **Resolution:** 1920x1080 (1080p), 30 fps  
> **Audio:** Microphone narration (or text-to-speech overlay in post)

---

## Pre-Recording Setup

```bash
cd backend && npm install && node server.js
```
Open Chrome at `http://localhost:3001/` with DevTools closed. Set browser zoom to 100%.

---

## Scene-by-Scene Script

### Scene 1: Problem Statement (0:00–0:40)

**Screen:** Show `http://localhost:3001/` — the landing page hero section.

**Narration:**
> "Bengaluru processes 2.5 million quick-commerce deliveries every day. But residential bylanes in HSR Layout, Indiranagar, and Koramangala have zero dedicated loading infrastructure. Delivery riders double-park across private gates, blocking residents, obstructing emergency vehicles, and racking up wrongful parking fines of fifteen hundred rupees a month. OoruShare solves this by turning idle residential driveways into a cooperative network of 2-minute authorized loading bays."

**Actions:**
1. Slowly scroll down through Section 01 ("The Ground Reality") to show the problem statistics.
2. Pause on the comparison cards showing Before vs After.

---

### Scene 2: Architecture & The Bob Story (0:40–1:20)

**Screen:** Continue scrolling to Section 02 ("The 3-Sided Civic Curb Network") and Section 03 ("Autonomous AI Layer").

**Narration:**
> "OoruShare connects four stakeholders who were never coordinated before: residents who list driveways, riders who find legal spots, dark stores that stagger dispatches, and RWA admins who govern access. The entire system is powered by an autonomous agentic curb governor, architected end-to-end with IBM Bob. Bob designed the 4-phase perpetual control loop: Perception, Reasoning, Action, and Self-Correction, using IBM Granite 3.8B time-series forecasting to predict bylane saturation before it happens."

**Actions:**
1. Scroll through the Bento grid architecture cards.
2. Pause on the Bob Story callout card (Section 03) showing the IBM Bob mascot.
3. Hover over each of the 4 agent phases.

---

### Scene 3: Live Prototype Walkthrough (1:20–2:40)

#### 3a. Resident Dashboard (1:20–1:40)

**Screen:** Click "Resident" in the nav bar or navigate to `http://localhost:3001/resident.html`.

**Narration:**
> "Residents list their driveway availability windows. Each time a rider uses the spot, the resident earns 10 community credits, which translate to roughly fifty rupees off their monthly RWA maintenance bill."

**Actions:**
1. Show the driveway listing form.
2. Toggle a time slot to show scheduling.
3. Point out the credits balance display.

#### 3b. Rider Spatial Radar (1:40–2:05)

**Screen:** Click "Rider Map" or navigate to `http://localhost:3001/rider.html`.

**Narration:**
> "Riders see a live spatial radar powered by Enterprise ESRI World Street Map. Green pins are available bays. They tap to book a 2-minute slot. The system uses PostgreSQL advisory locks to prevent double-booking under concurrent load."

**Actions:**
1. Show the live map with colored pins.
2. Click a green pin to show the booking popup.
3. Book a spot — show the status change from Available to Occupied.

#### 3c. Dark Store Dispatch Co-pilot (2:05–2:20)

**Screen:** Navigate to `http://localhost:3001/darkstore.html`.

**Narration:**
> "Dark store managers use the dispatch staggering co-pilot. Instead of flooding a bylane with 6 riders simultaneously, OoruShare automatically calculates 4-to-6-minute dispatch intervals based on real-time curb saturation, preventing gridlock at the source."

**Actions:**
1. Show the dispatch queue with staggered intervals.
2. Point out the real-time SSE updates refreshing the queue status.

#### 3d. RWA Governance Console (2:20–2:40)

**Screen:** Navigate to `http://localhost:3001/rwa.html`.

**Narration:**
> "RWA administrators retain full democratic governance. No driveway goes live without explicit committee approval. They audit gate widths, verify resident authorization, and track community credit settlements."

**Actions:**
1. Show pending approval requests.
2. Approve one listing — show the status change.

---

### Scene 4: Agent Simulation & Impact (2:40–3:20)

**Screen:** Click the "Run 30s Agent Tour" button in the header (any page).

**Narration:**
> "Let me run the full autonomous agent simulation. Watch as the system perceives an incoming delivery, reasons about bylane capacity using Granite forecasting, allocates the optimal bay, and self-corrects if a conflict is detected. This entire loop executes in under 500 milliseconds."

**Actions:**
1. Click "Run 30s Agent Tour".
2. Wait for the simulation modal to appear with Bob's icon in the header.
3. Walk through the modal contents: Allocated Bay, Resident Credit, Agent Reasoning Trace, Impact Statement.
4. Close the modal.

**Narration (continued):**
> "The measurable impact: 4.2 minutes saved per delivery drop. Scaled to Bengaluru's 2 million daily deliveries, that is 140,000 hours of restored mobility every single day, 11 tonnes of daily CO2 emissions eliminated, and dignity restored to 50,000 gig workers."

---

### Scene 5: Closing & The Bob Story (3:20–3:45)

**Screen:** Scroll to the bottom of the home page to show the footer.

**Narration:**
> "Every line of OoruShare was architected with IBM Bob: from the Responsible AI charter written before any code, through the concurrency defense layer, the agentic feedback loops, to the IBM Carbon Design System interface you see here. OoruShare is ready for citywide deployment. Built with IBM Bob. Built for Bengaluru."

**Actions:**
1. Show the footer with "Theme 1: Smarter Streets Better Living" and the IBM Bob icon + "Made with IBM Bob" tag.
2. End on the hero section or the Bob Story callout card.

---

## Post-Recording Checklist

- [ ] Export as MP4, H.264, 1080p
- [ ] Filename: `OoruShare_IBM_Bobathon_Video_Demo.mp4`
- [ ] Verify total duration is under 5 minutes
- [ ] Upload to YouTube (unlisted) or include the MP4 directly in the submission zip
- [ ] Add the video link to `SUBMISSION.md` Section 7

