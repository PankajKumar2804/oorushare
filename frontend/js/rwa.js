/**
 * js/rwa.js — RWA Admin Dashboard logic
 *
 * Features:
 *   - Summary cards: pending / approved / rejected spot counts
 *   - Filterable spot listings by rwa_status and neighbourhood
 *   - Approve / reject individual spots with instant feedback
 *   - Auto-refresh on filter change
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

/* ── Stats summary ── */
async function loadStats() {
  try {
    const res   = await fetch(`${API}/rwa/stats`);
    const rows  = await res.json();
    const byKey = {};
    rows.forEach(r => { byKey[r.rwa_status] = parseInt(r.count); });
    document.getElementById('stat-pending').textContent  = byKey.pending  || 0;
    document.getElementById('stat-approved').textContent = byKey.approved || 0;
    document.getElementById('stat-rejected').textContent = byKey.rejected || 0;
  } catch (_) {}
}

/* ── Spot listings table ── */
async function loadSpots() {
  const rwaStatus   = document.getElementById('filter-status').value;
  const neighborhood = document.getElementById('filter-neighborhood').value;
  let url = `${API}/rwa/spots`;
  const params = [];
  if (rwaStatus)    params.push(`rwa_status=${encodeURIComponent(rwaStatus)}`);
  if (neighborhood) params.push(`neighborhood=${encodeURIComponent(neighborhood)}`);
  if (params.length) url += '?' + params.join('&');

  try {
    const res   = await fetch(url);
    const spots = await res.json();
    const tbody = document.getElementById('spots-body');

    if (!spots.length) {
      tbody.innerHTML = '<tr class="empty"><td colspan="9">No spots match the selected filters.</td></tr>';
      return;
    }

    tbody.innerHTML = spots.map(s => {
      const rwaBadge = s.rwa_status === 'approved'
        ? `<span class="badge badge-completed">approved</span>`
        : s.rwa_status === 'rejected'
        ? `<span class="badge badge-cancelled">rejected</span>`
        : `<span class="badge badge-pending">pending</span>`;

      const actions = `
        <button class="btn btn-primary btn-sm" onclick="approve(${s.id})"
          ${s.rwa_status === 'approved' ? 'disabled' : ''}>Approve</button>
        <button class="btn btn-danger btn-sm" onclick="reject(${s.id})"
          style="margin-left:0.375rem;"
          ${s.rwa_status === 'rejected' ? 'disabled' : ''}>Reject</button>`;

      return `
        <tr>
          <td style="color:var(--gray-50);font-size:0.8rem;">${s.id}</td>
          <td>${esc(s.owner_name)}</td>
          <td style="max-width:200px;word-break:break-word;">${esc(s.address)}</td>
          <td>${esc(s.neighborhood)}</td>
          <td>${esc(s.gate_width_m)}m</td>
          <td style="white-space:nowrap;">${esc(s.available_from) || '—'} – ${esc(s.available_to) || '—'}</td>
          <td><span class="badge badge-${esc(s.status)}">${esc(s.status)}</span></td>
          <td>${rwaBadge}</td>
          <td style="white-space:nowrap;">${actions}</td>
        </tr>`;
    }).join('');
  } catch (_) {
    toast('Cannot reach backend. Is the server running?', 'error');
  }
}

/* ── Approve / reject ── */
window.approve = async function(id) {
  try {
    const res = await fetch(`${API}/rwa/spots/${id}/approve`, { method: 'PATCH' });
    if (!res.ok) { const e = await res.json(); return toast('Error: ' + e.error, 'error'); }
    toast('Spot approved — active on rider map.', 'success');
    loadSpots(); loadStats();
  } catch (_) {
    toast('Network error — could not approve spot.', 'error');
  }
};

window.reject = async function(id) {
  try {
    const res = await fetch(`${API}/rwa/spots/${id}/reject`, { method: 'PATCH' });
    if (!res.ok) { const e = await res.json(); return toast('Error: ' + e.error, 'error'); }
    toast('Spot rejected and hidden from the rider map.', 'success');
    loadSpots(); loadStats();
  } catch (_) {
    toast('Network error — could not reject spot.', 'error');
  }
};

/* ── Redemptions ledger ── */
async function loadRedemptions() {
  try {
    const res = await fetch(`${API}/credits/redemptions`);
    const list = await res.json();
    const tbody = document.getElementById('redemptions-body');
    if (!list || !list.length) {
      tbody.innerHTML = '<tr class="empty"><td colspan="7">No maintenance redemptions requested yet.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(r => `
      <tr>
        <td style="color:var(--gray-50);font-size:0.8rem;">#${r.id}</td>
        <td><strong>${esc(r.owner_name)}</strong></td>
        <td><span class="badge badge-pending">${r.credits_used} credits</span></td>
        <td style="color:var(--green);font-weight:600;">₹${parseFloat(r.inr_value).toFixed(0)}</td>
        <td>${esc(r.benefit_type)}</td>
        <td><span class="badge badge-completed">${esc(r.status)}</span></td>
        <td style="color:var(--gray-70);font-size:0.8125rem;">${new Date(r.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
  } catch (_) {}
}

/* ── Filter listeners ── */
document.getElementById('filter-status').addEventListener('change', loadSpots);
document.getElementById('filter-neighborhood').addEventListener('change', loadSpots);
document.getElementById('refresh-btn').addEventListener('click', () => { loadSpots(); loadStats(); loadRedemptions(); });

/* ── Boot ── */
loadSpots();
loadStats();
loadRedemptions();
setInterval(() => { loadSpots(); loadStats(); loadRedemptions(); }, 15000);
