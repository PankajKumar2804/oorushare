/**
 * js/darkstore.js — Dark Store Dispatch Co-pilot logic
 *
 * Features:
 *   - Live congestion bars per neighbourhood (pending riders / total dispatches)
 *   - Add a rider to the staggered dispatch queue
 *   - Live queue table with per-second countdown timers
 *   - Dispatch individual riders manually
 *   - Surge simulation: 5 riders staggered over 20 minutes
 *   - SSE live updates for the queue (supplement polling)
 *   - Store name persisted in localStorage
 */

const API = (window.location.protocol.startsWith('http'))
  ? (window.location.port === '8081' ? `${window.location.protocol}//${window.location.hostname}:3001` : window.location.origin)
  : 'http://localhost:3001';

/* ── Utilities ── */
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3500);
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function platformChip(p) {
  return `<span class="chip chip-${(p || '').toLowerCase()}">${esc(p)}</span>`;
}

function countdown(scheduledAt) {
  const diff = new Date(scheduledAt) - Date.now();
  if (diff <= 0) return '<span style="color:var(--green);font-weight:600;">Now</span>';
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `<span class="timer">${m}m ${s.toString().padStart(2, '0')}s</span>`;
}

/* ── Store name persistence ── */
const storeInput = document.getElementById('q-store');
const savedStore = localStorage.getItem('oorushare_store');
if (savedStore) storeInput.value = savedStore;
storeInput.addEventListener('change', () => {
  localStorage.setItem('oorushare_store', storeInput.value.trim());
});

/* ── Congestion stats ── */
async function loadStats() {
  try {
    const res   = await fetch(`${API}/queue/stats`);
    const stats = await res.json();
    const grid  = document.getElementById('congestion-grid');
    if (!stats.length) {
      grid.innerHTML = '<div class="stat-tile"><div class="number">0</div><div class="label">No data yet</div></div>';
      return;
    }
    const colors = { 'HSR Layout': '#0f62fe', 'Indiranagar': '#ff832b', 'Koramangala': '#24a148' };
    grid.innerHTML = stats.map(s => {
      const total = (parseInt(s.pending) + parseInt(s.dispatched) + parseInt(s.completed)) || 1;
      const pct   = Math.round((parseInt(s.pending) / total) * 100);
      const color = colors[s.neighborhood] || '#0f62fe';
      return `
        <div class="stat-tile">
          <div class="number" style="color:${color};">${s.pending}</div>
          <div class="label">${esc(s.neighborhood)} — Pending</div>
          <div class="congestion-bar">
            <div class="congestion-fill" style="width:${pct}%;background:${color};"></div>
          </div>
          <div class="congestion-meta">${s.dispatched} dispatched · ${s.completed} done</div>
        </div>`;
    }).join('');
  } catch (_) {}
}

/* ── Dispatch queue table ── */
async function loadQueue() {
  try {
    const res   = await fetch(`${API}/queue?status=pending`);
    const rows  = await res.json();
    const tbody = document.getElementById('queue-body');
    if (!rows.length) {
      tbody.innerHTML = '<tr class="empty"><td colspan="8">Queue is empty — add riders above.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(q => `
      <tr class="queue-row-${esc(q.status)}">
        <td>${esc(q.store_name)}</td>
        <td>${esc(q.neighborhood)}</td>
        <td>${esc(q.rider_name)}</td>
        <td>${platformChip(q.platform)}</td>
        <td style="white-space:nowrap;color:var(--gray-70);font-size:0.8125rem;">${new Date(q.scheduled_at).toLocaleTimeString()}</td>
        <td>${countdown(q.scheduled_at)}</td>
        <td><span class="badge badge-${q.status === 'pending' ? 'pending' : 'dispatched'}">${esc(q.status)}</span></td>
        <td>
          ${q.status === 'pending'
            ? `<button class="btn btn-secondary btn-sm" onclick="dispatch(${q.id})">Dispatch</button>`
            : '—'}
        </td>
      </tr>`).join('');
  } catch (_) {}
}

/* ── Dispatch a rider ── */
window.dispatch = async function(id) {
  try {
    await fetch(`${API}/queue/${id}/dispatch`, { method: 'PATCH' });
    toast('Rider dispatched!', 'success');
    loadQueue(); loadStats();
  } catch (_) {
    toast('Could not dispatch rider.', 'error');
  }
};

/* ── Add rider to queue ── */
document.getElementById('add-queue-btn').addEventListener('click', async () => {
  const body = {
    store_name:   document.getElementById('q-store').value.trim(),
    neighborhood: document.getElementById('q-neighborhood').value,
    rider_name:   document.getElementById('q-rider').value.trim(),
    platform:     document.getElementById('q-platform').value,
    stagger_mins: parseInt(document.getElementById('q-stagger').value) || 4,
  };
  if (!body.store_name || !body.rider_name) return toast('Store name and rider name are required.', 'error');
  localStorage.setItem('oorushare_store', body.store_name);
  const btn = document.getElementById('add-queue-btn');
  btn.disabled = true; btn.textContent = 'Adding…';
  try {
    const res = await fetch(`${API}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const e = await res.json(); return toast('Error: ' + e.error, 'error'); }
    const q = await res.json();
    toast(`${body.rider_name} scheduled at ${new Date(q.scheduled_at).toLocaleTimeString()} — ${body.stagger_mins} min stagger`, 'success');
    loadQueue(); loadStats();
  } catch (_) {
    toast('Network error — could not add rider.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Add to Dispatch Queue';
  }
});

/* ── Surge simulation ── */
document.getElementById('simulate-btn').addEventListener('click', async () => {
  const btn    = document.getElementById('simulate-btn');
  const status = document.getElementById('sim-status');
  btn.disabled = true; status.textContent = 'Simulating…';

  const store        = document.getElementById('q-store').value.trim() || 'Blinkit HSR';
  const neighborhood = document.getElementById('q-neighborhood').value;
  const platform     = document.getElementById('q-platform').value;
  const riders       = ['Ravi K', 'Sanjay D', 'Mohan R', 'Kiran S', 'Arun P'];

  try {
    for (const rider of riders) {
      await fetch(`${API}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_name: store, neighborhood, rider_name: rider, platform, stagger_mins: 4 }),
      });
      await new Promise(r => setTimeout(r, 150));
    }
    status.textContent = '5 riders added — staggered over 20 minutes';
    toast('Surge simulation complete — 5 riders staggered over 20 minutes', 'success');
  } catch (_) {
    toast('Simulation failed — is the backend running?', 'error');
    status.textContent = '';
  } finally {
    btn.disabled = false;
    loadQueue(); loadStats();
  }
});

/* ── Partner Webhook Dispatch simulation ── */
const webhookBtn = document.getElementById('webhook-btn');
if (webhookBtn) {
  webhookBtn.addEventListener('click', async () => {
    webhookBtn.disabled = true;
    webhookBtn.textContent = 'Allocating…';
    try {
      const orderNum = Math.floor(1000 + Math.random() * 9000);
      const res = await fetch(`${API}/integrations/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: document.getElementById('q-platform').value || 'Blinkit',
          order_id: `ORD-${orderNum}`,
          rider_name: `Rider #${Math.floor(10 + Math.random() * 89)}`,
          dest_lat: 12.9116,
          dest_lng: 77.6412
        }),
      });
      const data = await res.json();
      if (!res.ok) return toast(data.message || data.error || 'Allocation error', 'error');

      toast(`Partner Webhook: Bay #${data.allocated_spot.id} allocated (${data.allocated_spot.distance_metres}m proximity)`, 'success');
      loadQueue(); loadStats(); loadAgentStream();
    } catch (_) {
      toast('Webhook request failed.', 'error');
    } finally {
      webhookBtn.disabled = false;
      webhookBtn.textContent = 'Test Platform Webhook Dispatch';
    }
  });
}

/* ── SSE ── */
function connectSSE() {
  const sse = new EventSource(`${API}/live`);
  sse.onmessage = () => { loadQueue(); loadStats(); };
  sse.onerror   = () => {
    const ind = document.getElementById('queue-live');
    ind.textContent = '● Offline'; ind.className = 'live-dot off';
    sse.close();
    setTimeout(connectSSE, 5000);
  };
  sse.onopen = () => {
    const ind = document.getElementById('queue-live');
    ind.textContent = '● Live'; ind.className = 'live-dot on';
  };
}

/* ── IBM Granite 3.8B AI Congestion Advisory ── */
let currentRecommendedStagger = 4;
async function loadGraniteForecast() {
  try {
    const res = await fetch(`${API}/queue/forecast`);
    if (!res.ok) return;
    const f = await res.json();
    currentRecommendedStagger = f.recommended_stagger_mins;
    const textEl = document.getElementById('granite-advisory-text');
    if (textEl) {
      textEl.innerHTML = `<strong>${f.surge_status} (${f.congestion_risk_probability_pct}% risk)</strong> — ${f.watsonx_rationale} Recommended buffer: <strong>${f.recommended_stagger_mins} min</strong>.`;
    }
  } catch (_) {}
}

const applyGraniteBtn = document.getElementById('apply-granite-btn');
if (applyGraniteBtn) {
  applyGraniteBtn.addEventListener('click', () => {
    document.getElementById('q-stagger').value = currentRecommendedStagger;
    toast(`Applied IBM Granite dynamic buffer: ${currentRecommendedStagger} minutes`, 'success');
  });
}

/* ── Agentic Co-pilot Decision Stream ── */
async function loadAgentStream() {
  try {
    const res = await fetch(`${API}/agent/activity`);
    if (!res.ok) return;
    const data = await res.json();
    const container = document.getElementById('agent-thought-stream');
    if (!container || !data.recent_thoughts) return;

    container.innerHTML = data.recent_thoughts.slice(0, 5).map(t => {
      const phaseColor = t.phase === 'PERCEPTION' ? 'var(--blue)' : t.phase === 'REASONING' ? 'var(--purple)' : 'var(--green)';
      return `
        <div style="margin-bottom:0.6rem;padding-bottom:0.4rem;border-bottom:1px dashed var(--gray-20);">
          <span style="color:${phaseColor};font-weight:700;">[${esc(t.phase)}]</span>
          <span style="color:var(--gray-50);font-size:0.75rem;">${esc(t.timestamp)} · ${esc(t.zone)}</span><br>
          <span style="color:var(--gray-100);">${esc(t.message)}</span><br>
          <span style="color:var(--gray-70);font-size:0.75rem;font-style:italic;">Reasoning: ${esc(t.reasoning)}</span>
        </div>
      `;
    }).join('');
  } catch (_) {}
}

connectSSE();
loadQueue();
loadStats();
loadGraniteForecast();
loadAgentStream();
setInterval(loadStats, 5000);
setInterval(loadQueue, 1000); /* keep countdowns ticking */
setInterval(loadAgentStream, 8000);
setInterval(loadGraniteForecast, 30000);
