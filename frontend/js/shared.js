/**
 * js/shared.js — Shared Bengaluru Civic Telemetry & Agent Utilities
 *
 * Theme 1: Smarter Streets Better Living (IBM Bobathon)
 */

const SHARED_API = (window.location.protocol.startsWith('http'))
  ? (window.location.port === '8081' ? `${window.location.protocol}//${window.location.hostname}:3001` : window.location.origin)
  : 'http://localhost:3001';

async function updateTelemetry() {
  try {
    const res = await fetch(`${SHARED_API}/agent/impact`);
    if (!res.ok) return;
    const data = await res.json();
    const t = data.telemetry;

    const co2El   = document.getElementById('esg-co2')  || document.getElementById('hero-co2');
    const timeEl  = document.getElementById('esg-time') || document.getElementById('hero-time');
    const dispEl  = document.getElementById('esg-disputes');
    const finesEl = document.getElementById('esg-fines') || document.getElementById('hero-fines');

    if (co2El)   co2El.textContent   = `${t.co2_emissions_abated_kg} kg`;
    if (timeEl)  timeEl.textContent  = `${data.primary_metric.headline.split(' ')[0]} min`;
    if (dispEl)  dispEl.textContent  = `-${t.rwa_dispute_reduction_pct}%`;
    if (finesEl) finesEl.textContent = `₹${(t.police_fines_averted_inr || 12500).toLocaleString('en-IN')}`;
  } catch (_) {}
}

/* ── Animated phase stepper ─────────────────────────────────────────────── */
const PHASES = [
  { key: 'PERCEPTION',  label: 'Phase 1 · Perception',  desc: 'Monitoring active dispatches and bylane density across HSR Layout, Indiranagar, Koramangala…',   color: '#0f62fe' },
  { key: 'REASONING',   label: 'Phase 2 · Reasoning',   desc: 'IBM Granite 3.8B evaluating 15-minute congestion forecast. Scoring driveway suitability…',        color: '#8a3ffc' },
  { key: 'ACTION',      label: 'Phase 3 · Action',       desc: 'PostgreSQL advisory lock acquired. Reserving optimal loading bay. Awarding community credits…',   color: '#ff832b' },
  { key: 'REFLECTION',  label: 'Phase 4 · Reflection',   desc: 'Conflict scan complete. No blocked bays detected. SSE broadcast pushed to all active riders…',   color: '#24a148' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function animatePhases(stepperEl) {
  for (let i = 0; i < PHASES.length; i++) {
    const ph = PHASES[i];
    // Mark previous as done
    if (i > 0) {
      const prev = stepperEl.querySelector(`[data-phase="${PHASES[i-1].key}"]`);
      if (prev) { prev.style.opacity = '0.5'; prev.querySelector('.phase-dot').textContent = '✓'; }
    }
    const el = stepperEl.querySelector(`[data-phase="${ph.key}"]`);
    if (el) {
      el.style.borderLeftColor = ph.color;
      el.style.opacity = '1';
      el.querySelector('.phase-dot').textContent = '●';
      el.querySelector('.phase-dot').style.color = ph.color;
      el.querySelector('.phase-status').textContent = 'Running…';
      el.querySelector('.phase-status').style.color = ph.color;
    }
    await sleep(600);
    if (el) {
      el.querySelector('.phase-status').textContent = 'Done';
      el.querySelector('.phase-status').style.color = '#24a148';
    }
    await sleep(200);
  }
  // Mark last done
  const last = stepperEl.querySelector(`[data-phase="REFLECTION"]`);
  if (last) { last.style.opacity = '0.5'; last.querySelector('.phase-dot').textContent = '✓'; }
}

function buildPhaseStepper() {
  return PHASES.map(ph => `
    <div data-phase="${ph.key}" style="
      display:flex; align-items:flex-start; gap:0.75rem;
      padding:0.65rem 0.75rem; border-left:3px solid #393939;
      background:#f4f4f4; margin-bottom:0.4rem; opacity:0.4;
      transition: opacity 0.3s, border-left-color 0.3s;">
      <span class="phase-dot" style="font-size:0.7rem;margin-top:0.1rem;width:1rem;text-align:center;">○</span>
      <div style="flex:1;min-width:0;">
        <div style="font-family:var(--font-mono);font-size:0.7rem;font-weight:700;color:#161616;text-transform:uppercase;letter-spacing:0.04em;">${ph.label}</div>
        <div style="font-size:0.78rem;color:#525252;margin-top:0.15rem;line-height:1.4;">${ph.desc}</div>
      </div>
      <span class="phase-status" style="font-size:0.7rem;white-space:nowrap;color:#8d8d8d;">Queued</span>
    </div>`).join('');
}

/* ── Judge Tour ─────────────────────────────────────────────────────────── */
window.runJudgeTour = async function() {
  const btn = document.querySelector('.tour-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Simulating…'; }

  // Show modal immediately with stepper running
  let modal = document.getElementById('wx-tour-modal');
  if (!modal) modal = createTourModal();

  // Reset modal to loading state
  const stepper = document.getElementById('wx-phase-stepper');
  const result  = document.getElementById('wx-result-section');
  if (stepper) stepper.innerHTML = buildPhaseStepper();
  if (result)  result.style.display = 'none';

  modal.style.display = 'flex';

  // Kick off animation and API call in parallel
  const animPromise = stepper ? animatePhases(stepper) : Promise.resolve();
  const apiPromise  = fetch(`${SHARED_API}/agent/tour`, { method: 'POST' }).then(r => r.json());

  try {
    const [, data] = await Promise.all([animPromise, apiPromise]);

    if (data.error) {
      if (result) { result.style.display = 'block'; result.innerHTML = `<div style="color:var(--red);padding:0.75rem;">Error: ${data.error}</div>`; }
      return;
    }

    // Populate and reveal result panel
    const spotEl    = document.getElementById('wx-allocated-spot');
    const residentEl= document.getElementById('wx-resident-name');
    const thoughtEl = document.getElementById('wx-agent-thought');
    const impactEl  = document.getElementById('wx-impact-statement');

    if (spotEl)     spotEl.textContent     = `Bay #${data.allocated_spot.id} · ${data.allocated_spot.address} (${data.allocated_spot.neighborhood})`;
    if (residentEl) residentEl.textContent = `Resident: ${data.allocated_spot.owner}`;
    if (thoughtEl)  thoughtEl.textContent  = `Phase [${data.agent_thought.phase}] at ${data.agent_thought.timestamp}:\n${data.agent_thought.message}\n\nConstraint Analysis: ${data.agent_thought.reasoning}`;
    if (impactEl)   impactEl.textContent   = data.impact_summary;

    if (result) result.style.display = 'block';
    updateTelemetry();
  } catch (_) {
    if (result) { result.style.display = 'block'; result.innerHTML = `<div style="color:var(--red);padding:0.75rem;">Network error — is the backend running on :3001?</div>`; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Run 30s Agent Tour'; }
  }
};

function createTourModal() {
  const div = document.createElement('div');
  div.id = 'wx-tour-modal';
  div.className = 'wx-modal-overlay';
  div.innerHTML = `
    <div class="wx-modal" style="max-width:640px;">
      <h3>
        <span style="display:flex;align-items:center;gap:0.5rem;">
          <img src="images/ibm-bob.svg" width="22" height="22" alt="IBM Bob" />
          OoruShare Autonomous Curb Governor — Audit Trace
        </span>
        <button onclick="document.getElementById('wx-tour-modal').style.display='none'"
          style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--gray-70);line-height:1;">&times;</button>
      </h3>
      <div style="font-size:0.75rem;color:var(--gray-70);margin-bottom:1rem;font-family:var(--font-mono);">
        Perception → Reasoning → Action → Reflection &nbsp;|&nbsp; Bengaluru Bylane Governor · Built with IBM Bob
      </div>

      <!-- Animated phase stepper -->
      <div id="wx-phase-stepper">${buildPhaseStepper()}</div>

      <!-- Result section (hidden until phases complete) -->
      <div id="wx-result-section" style="display:none;margin-top:1rem;">
        <div class="wx-metrics-grid">
          <div class="wx-metric-box">
            <div class="label">Allocated Loading Bay</div>
            <div class="val" id="wx-allocated-spot" style="font-size:0.82rem;line-height:1.4;">—</div>
          </div>
          <div class="wx-metric-box">
            <div class="label">Resident Maintenance Offset</div>
            <div class="val" style="color:var(--green);">+10 Credits (₹50)</div>
            <div style="font-size:0.7rem;color:var(--gray-70);" id="wx-resident-name">—</div>
          </div>
        </div>

        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--blue);letter-spacing:0.04em;margin-top:0.75rem;">
          Agent Decision Trace
        </div>
        <div class="wx-reasoning" id="wx-agent-thought">—</div>

        <div style="margin-top:0.85rem;font-size:0.78rem;background:#f0fdf4;border-left:3px solid var(--green);padding:0.6rem;color:#15803d;">
          <strong>Verified Outcome:</strong> <span id="wx-impact-statement">—</span>
        </div>
      </div>

      <div style="margin-top:1.25rem;display:flex;justify-content:flex-end;">
        <button class="btn btn-primary btn-sm"
          onclick="document.getElementById('wx-tour-modal').style.display='none'">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  return div;
}

// Initial telemetry fetch & 15s refresh
updateTelemetry();
setInterval(updateTelemetry, 15000);
