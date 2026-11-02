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

    const co2El = document.getElementById('esg-co2') || document.getElementById('hero-co2');
    const timeEl = document.getElementById('esg-time') || document.getElementById('hero-time');
    const dispEl = document.getElementById('esg-disputes');
    const finesEl = document.getElementById('esg-fines') || document.getElementById('hero-fines');

    if (co2El) co2El.textContent = `${t.co2_emissions_abated_kg} kg`;
    if (timeEl) timeEl.textContent = `${data.primary_metric.headline.split(' ')[0]} min`;
    if (dispEl) dispEl.textContent = `-${t.rwa_dispute_reduction_pct}%`;
    if (finesEl) finesEl.textContent = `₹${(t.police_fines_averted_inr || 12500).toLocaleString('en-IN')}`;
  } catch (_) {}
}

window.runJudgeTour = async function() {
  const btn = document.querySelector('.tour-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Simulating Agent Loop…';
  }

  try {
    const res = await fetch(`${SHARED_API}/agent/tour`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      alert('Simulation execution failed. Ensure backend server is running on :3001.');
      return;
    }

    const modal = document.getElementById('wx-tour-modal') || createTourModal();
    document.getElementById('wx-allocated-spot').textContent = `Bay #${data.allocated_spot.id} · ${data.allocated_spot.address} (${data.allocated_spot.neighborhood})`;
    document.getElementById('wx-resident-name').textContent = `Resident: ${data.allocated_spot.owner}`;
    document.getElementById('wx-agent-thought').textContent = `Phase [${data.agent_thought.phase}] at ${data.agent_thought.timestamp}:\n${data.agent_thought.message}\n\nConstraint Analysis: ${data.agent_thought.reasoning}`;
    document.getElementById('wx-impact-statement').textContent = data.impact_summary;

    modal.style.display = 'flex';
    updateTelemetry();
  } catch (err) {
    alert('Network error executing simulation.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Run 30s Agent Tour';
    }
  }
};

function createTourModal() {
  const div = document.createElement('div');
  div.id = 'wx-tour-modal';
  div.className = 'wx-modal-overlay';
  div.innerHTML = `
    <div class="wx-modal">
      <h3>
        <span style="display:flex;align-items:center;gap:0.5rem;"><img src="images/ibm-bob.svg" width="22" height="22" alt="IBM Bob" /> OoruShare Autonomous Curb Governor &mdash; Audit Trace</span>
        <button onclick="document.getElementById('wx-tour-modal').style.display='none'" style="background:none;border:none;font-size:1.1rem;cursor:pointer;color:var(--gray-70);">&times;</button>
      </h3>
      <div style="font-size:0.78rem;color:var(--gray-70);margin-bottom:0.85rem;">
        Bengaluru Bylane Capacity Governor &middot; Built with IBM Bob
      </div>

      <div class="wx-metrics-grid">
        <div class="wx-metric-box">
          <div class="label">Allocated Loading Bay</div>
          <div class="val" id="wx-allocated-spot" style="font-size:0.82rem;line-height:1.4;">Bay #—</div>
        </div>
        <div class="wx-metric-box">
          <div class="label">Resident Maintenance Offset</div>
          <div class="val" style="color:var(--green);">+10 Credits (₹50)</div>
          <div style="font-size:0.7rem;color:var(--gray-70);" id="wx-resident-name">—</div>
        </div>
      </div>

      <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--blue);letter-spacing:0.04em;margin-top:0.75rem;">
        Agentic Capacity Decision (Perception → Reasoning → Action)
      </div>
      <div class="wx-reasoning" id="wx-agent-thought">—</div>

      <div style="margin-top:0.85rem;font-size:0.78rem;background:#f0fdf4;border-left:3px solid var(--green);padding:0.6rem;color:#15803d;">
        <strong>Verified Outcome:</strong> <span id="wx-impact-statement">—</span>
      </div>

      <div style="margin-top:1.25rem;display:flex;justify-content:flex-end;">
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('wx-tour-modal').style.display='none'">Close Audit Trace</button>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  return div;
}

// Initial telemetry fetch & 15s refresh
updateTelemetry();
setInterval(updateTelemetry, 15000);

