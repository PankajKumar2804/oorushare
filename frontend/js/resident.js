/**
 * js/resident.js — Resident Dashboard logic
 *
 * Features:
 *   - List a new driveway spot
 *   - View all spots (filtered to current owner)
 *   - Toggle spot availability
 *   - View community credit history and balance
 *   - Owner name persisted in localStorage across page loads
 *   - "Use My Location" to auto-fill lat/lng via Geolocation API
 *   - Auto-refresh every 10 seconds
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

/* ── Owner name persistence ── */
const ownerInput = document.getElementById('f-owner');
// Pre-fill with first seeded resident so the dashboard loads with real data on first visit
const savedOwner = localStorage.getItem('oorushare_owner') || 'Priya Sharma';
ownerInput.value = savedOwner;
ownerInput.addEventListener('change', () => {
  localStorage.setItem('oorushare_owner', ownerInput.value.trim());
  const sel = document.getElementById('demo-resident');
  if (sel) sel.value = ownerInput.value.trim();
});

/* ── Demo resident switcher ── */
const demoSel = document.getElementById('demo-resident');
if (demoSel) {
  // Sync dropdown to saved owner on load
  demoSel.value = savedOwner;
  demoSel.addEventListener('change', () => {
    ownerInput.value = demoSel.value;
    localStorage.setItem('oorushare_owner', demoSel.value);
    refresh();
  });
}

/* ── "Use My Location" button ── */
document.getElementById('use-location-btn').addEventListener('click', () => {
  if (!navigator.geolocation) return toast('Geolocation not supported by your browser.', 'error');
  const btn = document.getElementById('use-location-btn');
  btn.disabled = true; btn.textContent = 'Getting…';
  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById('f-lat').value = pos.coords.latitude.toFixed(6);
      document.getElementById('f-lng').value = pos.coords.longitude.toFixed(6);
      toast('Location coordinates captured.', 'success');
      btn.disabled = false; btn.textContent = 'Detect GPS Location';
    },
    () => {
      toast('Could not detect location. Enter coordinates manually.', 'error');
      btn.disabled = false; btn.textContent = 'Detect GPS Location';
    }
  );
});

/* ── Data fetchers ── */
async function loadSpots(owner) {
  const res = await fetch(`${API}/spots${owner ? '?owner_name=' + encodeURIComponent(owner) : ''}`);
  return res.json();
}

async function loadCredits(owner) {
  const res = await fetch(`${API}/credits${owner ? '?owner_name=' + encodeURIComponent(owner) : ''}`);
  return res.json();
}

/* ── Toggle spot status ── */
window.toggleStatus = async function(id, status) {
  await fetch(`${API}/spots/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  toast(`Spot marked as ${status}`);
  refresh();
};

/* ── Render ── */
async function refresh() {
  const owner = document.getElementById('f-owner').value.trim();
  let spots, credits;
  try {
    [spots, credits] = await Promise.all([loadSpots(owner), loadCredits(owner)]);
  } catch (_) {
    toast('Cannot reach backend. Is the server running?', 'error');
    return;
  }

  document.getElementById('stat-spots').textContent    = spots.length;
  const totalCredits = credits.reduce((s, c) => s + parseFloat(c.credits), 0);
  document.getElementById('stat-credits').textContent  = totalCredits.toFixed(0);
  document.getElementById('stat-bookings').textContent = credits.filter(c => c.booking_id).length;

  const bar = document.getElementById('credit-bar');
  if (totalCredits > 0) {
    bar.style.display = 'flex';
    document.getElementById('credit-bar-text').textContent =
      `You have ${totalCredits.toFixed(0)} community credits available (worth ₹${(totalCredits * 5).toFixed(0)} maintenance discount)`;
  } else {
    bar.style.display = 'none';
  }

  const tbody = document.getElementById('spots-body');
  if (!spots.length) {
    tbody.innerHTML = '<tr class="empty"><td colspan="6">No spots listed yet. Use the form above to share your driveway.</td></tr>';
  } else {
    tbody.innerHTML = spots.map(s => `
      <tr>
        <td>${esc(s.address)}</td>
        <td>${esc(s.neighborhood)}</td>
        <td>${esc(s.gate_width_m)}m</td>
        <td style="white-space:nowrap;">${esc(s.available_from) || '—'} – ${esc(s.available_to) || '—'}</td>
        <td><span class="badge badge-${esc(s.status)}">${esc(s.status)}</span></td>
        <td>
          ${s.status === 'available'
            ? `<button class="btn btn-secondary btn-sm" onclick="toggleStatus(${s.id},'unavailable')">Mark Unavailable</button>`
            : s.status === 'unavailable'
            ? `<button class="btn btn-primary btn-sm" onclick="toggleStatus(${s.id},'available')">Mark Available</button>`
            : `<span style="color:var(--gray-50);font-size:0.8rem;">In use</span>`}
        </td>
      </tr>`).join('');
  }

  const cbody = document.getElementById('credits-body');
  if (!credits.length) {
    cbody.innerHTML = '<tr class="empty"><td colspan="3">No credits yet — list your driveway to start earning.</td></tr>';
  } else {
    cbody.innerHTML = credits.map(c => `
      <tr>
        <td>${esc(c.reason)}</td>
        <td style="color:var(--green);font-weight:600;">+${parseFloat(c.credits).toFixed(0)}</td>
        <td style="color:var(--gray-70);font-size:0.8125rem;">${new Date(c.created_at).toLocaleString()}</td>
      </tr>`).join('');
  }
}

/* ── List a new spot ── */
document.getElementById('list-btn').addEventListener('click', async () => {
  const body = {
    owner_name:     document.getElementById('f-owner').value.trim(),
    address:        document.getElementById('f-address').value.trim(),
    neighborhood:   document.getElementById('f-neighborhood').value,
    lat:            parseFloat(document.getElementById('f-lat').value),
    lng:            parseFloat(document.getElementById('f-lng').value),
    gate_width_m:   parseFloat(document.getElementById('f-width').value) || 3.0,
    available_from: document.getElementById('f-from').value,
    available_to:   document.getElementById('f-to').value,
  };
  if (!body.owner_name || !body.address || isNaN(body.lat) || isNaN(body.lng)) {
    return toast('Please fill in name, address, latitude and longitude.', 'error');
  }
  localStorage.setItem('oorushare_owner', body.owner_name);
  const btn = document.getElementById('list-btn');
  btn.disabled = true; btn.textContent = 'Listing…';
  try {
    const res = await fetch(`${API}/spots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const e = await res.json(); return toast('Error: ' + e.error, 'error'); }
    toast('Driveway listed — you will earn 10 credits each time a rider books it.', 'success');
    refresh();
  } finally {
    btn.disabled = false; btn.textContent = 'List My Driveway';
  }
});

/* ── Redeem credits for RWA maintenance offset ── */
const redeemBtn = document.getElementById('redeem-btn');
if (redeemBtn) {
  redeemBtn.addEventListener('click', async () => {
    const owner = document.getElementById('f-owner').value.trim();
    if (!owner) return toast('Please enter your name first.', 'error');
    if (!confirm(`Redeem 10 credits for a ₹50 deduction on your ${owner} monthly RWA maintenance bill?`)) return;

    try {
      const res = await fetch(`${API}/credits/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_name: owner, credits_to_redeem: 10 }),
      });
      const data = await res.json();
      if (!res.ok) return toast(data.error || 'Redemption failed', 'error');
      toast(`Successfully redeemed: ₹${data.inr_saved} applied to RWA maintenance bill.`, 'success');
      refresh();
    } catch (_) {
      toast('Could not complete credit redemption.', 'error');
    }
  });
}

/* ── Boot ── */
refresh();
setInterval(refresh, 10000);
