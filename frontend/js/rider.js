/**
 * js/rider.js — Rider Spatial Radar logic
 *
 * Theme 1: Smarter Streets Better Living (IBM Bobathon)
 *
 * Features:
 *   - Leaflet map centred on Bengaluru pilot corridor (HSR · Indiranagar · Koramangala)
 *   - Resilient tile layers (CartoDB Positron + OpenStreetMap fallback)
 *   - Immediate spot fetch on load + real-time SSE stream (/live)
 *   - Neighbourhood cluster filter with camera pan/zoom
 *   - Spot booking panel (2-min slots, 10 community credits)
 *   - Conflict handling & auto-reroute for blocked driveway bays
 *   - InvalidateSize on mount and window resize
 */

const API = (window.location.protocol.startsWith('http'))
  ? (window.location.port === '8081' ? `${window.location.protocol}//${window.location.hostname}:3001` : window.location.origin)
  : 'http://localhost:3001';

let map = null;
let markers = {};
let selectedSpot = null;
let cachedSpots = [];

/* ── Utilities ── */
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
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

/* ── Rider name persistence ── */
const riderNameInput = document.getElementById('rider-name');
if (riderNameInput) {
  const savedRider = localStorage.getItem('oorushare_rider');
  if (savedRider) riderNameInput.value = savedRider;
  riderNameInput.addEventListener('change', () => {
    localStorage.setItem('oorushare_rider', riderNameInput.value.trim());
  });
}

/* ── Map initialization ── */
function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  if (typeof L === 'undefined') {
    mapEl.innerHTML = `
      <div style="padding:3rem 2rem;text-align:center;color:var(--gray-70);">
        <p style="font-weight:600;font-size:1.1rem;color:var(--gray-90);">Leaflet spatial engine is initializing…</p>
        <p style="font-size:0.85rem;margin-top:0.5rem;">If the map does not appear shortly, please reload the page.</p>
      </div>`;
    return;
  }

  try {
    // Default center: Bengaluru central-south corridor covering HSR, Indiranagar, and Koramangala
    map = L.map('map', {
      center: [12.9450, 77.6350],
      zoom: 12,
      minZoom: 10,
      maxZoom: 19,
      zoomControl: true
    });

    // Primary: Enterprise ESRI World Street Map (Unrestricted, no 403 volunteer blocks, full Bengaluru street geometry)
    const esriStreetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '&copy; Esri &mdash; Bengaluru Civic Pilot'
    });

    // Subtle Gray Canvas option (Carbon-aligned neutral base)
    const esriGrayLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '&copy; Esri Canvas'
    });

    esriStreetLayer.addTo(map);

    // Layer switcher control for judges & evaluators
    L.control.layers({
      'City Streets': esriStreetLayer,
      'Neutral Canvas': esriGrayLayer
    }, null, { position: 'topright' }).addTo(map);

    /* Legend */
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');
      div.innerHTML =
        '<b>Spot Status</b>' +
        '<div><span style="background:#24a148"></span> Available</div>' +
        '<div><span style="background:#da1e28"></span> Booked</div>' +
        '<div><span style="background:#8d8d8d"></span> Unavailable</div>';
      return div;
    };
    legend.addTo(map);

    // Ensure Leaflet recalculates viewport bounds immediately after rendering
    setTimeout(() => { if (map) map.invalidateSize(); }, 150);
    setTimeout(() => { if (map) map.invalidateSize(); }, 500);

    window.addEventListener('resize', () => {
      if (map) map.invalidateSize();
    });
  } catch (err) {
    console.error('Error initializing map:', err);
  }
}

/* ── Marker styling helpers ── */
function spotColor(status) {
  return status === 'available' ? '#24a148' : status === 'booked' ? '#da1e28' : '#8d8d8d';
}

function makeIcon(status) {
  const color = spotColor(status);
  const size  = status === 'available' ? 18 : 14;
  const pulse = status === 'available'
    ? `<div style="position:absolute;top:-4px;left:-4px;width:${size+8}px;height:${size+8}px;border-radius:50%;background:rgba(36,161,72,0.3);animation:pulse 2s infinite ease-out;"></div>`
    : '';

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${pulse}
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.45);position:relative;z-index:2;"></div>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/* ── Booking panel ── */
window.openPanel = function(spot) {
  selectedSpot = spot;
  const addrEl = document.getElementById('panel-address');
  const metaEl = document.getElementById('panel-meta');
  const btn = document.getElementById('book-btn');

  if (addrEl) addrEl.textContent = spot.address || spot.owner_name;
  if (metaEl) {
    metaEl.textContent = `${spot.neighborhood} · Gate width: ${spot.gate_width_m}m · Status: ${spot.status.toUpperCase()}`;
  }
  if (btn) {
    btn.disabled    = spot.status !== 'available';
    btn.textContent = spot.status === 'available' ? 'Book This Spot (2 min)' : 'Currently ' + spot.status;
  }
  const panel = document.getElementById('spot-panel');
  if (panel) panel.style.display = 'block';
};

window.closePanel = function() {
  const panel = document.getElementById('spot-panel');
  if (panel) panel.style.display = 'none';
  selectedSpot = null;
};

/* ── Render spots on map & KPI cards ── */
function renderSpots(spots) {
  if (!Array.isArray(spots)) return;
  cachedSpots = spots;

  const nbFilter = document.getElementById('filter-neighborhood');
  const selectedNb = nbFilter ? nbFilter.value : '';
  const filtered = selectedNb ? spots.filter(s => s.neighborhood === selectedNb) : spots;

  // Update KPI counters
  const availEl = document.getElementById('s-available');
  const bookEl  = document.getElementById('s-booked');
  const totEl   = document.getElementById('s-total');

  if (availEl) availEl.textContent = filtered.filter(s => s.status === 'available').length;
  if (bookEl)  bookEl.textContent  = filtered.filter(s => s.status === 'booked').length;
  if (totEl)   totEl.textContent   = filtered.length;

  if (!map || typeof L === 'undefined') return;

  const seen = new Set();
  const markerList = [];

  filtered.forEach(spot => {
    seen.add(spot.id);
    const lat = parseFloat(spot.lat);
    const lng = parseFloat(spot.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    if (markers[spot.id]) {
      markers[spot.id].setIcon(makeIcon(spot.status));
      markers[spot.id]._spot = spot;
      markerList.push(markers[spot.id]);

      // If panel is currently open on this spot, refresh its state
      if (selectedSpot && selectedSpot.id === spot.id) {
        openPanel(spot);
      }
    } else {
      const m = L.marker([lat, lng], { icon: makeIcon(spot.status) })
        .addTo(map)
        .bindTooltip(`<strong>${esc(spot.address || spot.owner_name)}</strong><br>${esc(spot.neighborhood)} · ${esc(spot.status)}`, { direction: 'top' });
      m._spot = spot;
      m.on('click', () => openPanel(m._spot));
      markers[spot.id] = m;
      markerList.push(m);
    }
  });

  // Remove markers no longer in filtered view
  Object.keys(markers).forEach(id => {
    if (!seen.has(parseInt(id))) {
      markers[id].remove();
      delete markers[id];
    }
  });
}

/* ── Immediate spots load (never wait for SSE) ── */
async function loadSpots() {
  try {
    const res = await fetch(`${API}/spots`);
    if (!res.ok) return;
    const data = await res.json();
    renderSpots(data);
  } catch (err) {
    console.warn('Initial spot load error:', err);
  }
}

/* ── Recent bookings table ── */
async function loadBookings() {
  try {
    const res    = await fetch(`${API}/bookings`);
    if (!res.ok) return;
    const data   = await res.json();
    const tbody  = document.getElementById('bookings-body');
    if (!tbody) return;

    const recent = data.slice(0, 10);
    if (!recent.length) {
      tbody.innerHTML = '<tr class="empty"><td colspan="6">No bookings yet.</td></tr>';
    } else {
      tbody.innerHTML = recent.map(b => {
        const statusKey = b.status === 'active' ? 'active' : b.status === 'completed' ? 'completed' : 'cancelled';
        const actionBtn = b.status === 'active'
          ? `<button class="btn btn-danger btn-sm" onclick="reportBlocked(${b.id})">Report Blocked</button>`
          : '—';
        return `
          <tr>
            <td>#${b.spot_id}</td>
            <td>${esc(b.rider_name)}</td>
            <td>${platformChip(b.platform)}</td>
            <td style="white-space:nowrap;color:var(--gray-70);font-size:0.8125rem;">${new Date(b.booked_at).toLocaleTimeString()}</td>
            <td><span class="badge badge-${statusKey}">${esc(b.status)}</span></td>
            <td>${actionBtn}</td>
          </tr>`;
      }).join('');
    }
  } catch (_) {}
}

/* ── Report Spot Blocked & Autonomous Reallocation ── */
window.reportBlocked = async function(bookingId) {
  if (!confirm('Flag this driveway bay as blocked? The autonomous governor will reallocate you to the nearest free bay.')) return;
  try {
    const res = await fetch(`${API}/bookings/${bookingId}/report-blocked`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return toast(data.error || 'Could not report blocked bay', 'error');

    if (data.reallocated && data.new_spot) {
      toast(`Reallocated: Bay #${data.new_spot.id} · ${data.new_spot.address} (${data.new_spot.gate_width_m}m gate)`, 'success');
    } else {
      toast(data.message, 'error');
    }
    loadSpots();
    loadBookings();
  } catch (_) {
    toast('Network error while reporting blocked bay', 'error');
  }
};

/* ── Book a spot ── */
const bookBtn = document.getElementById('book-btn');
if (bookBtn) {
  bookBtn.addEventListener('click', async () => {
    if (!selectedSpot) return;
    const riderName = (document.getElementById('rider-name')?.value || '').trim();
    if (!riderName) return toast('Enter your rider name before booking.', 'error');
    localStorage.setItem('oorushare_rider', riderName);
    const platform = document.getElementById('rider-platform')?.value || 'Blinkit';

    bookBtn.disabled = true;
    bookBtn.textContent = 'Booking…';

    try {
      const res = await fetch(`${API}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spot_id: selectedSpot.id, rider_name: riderName, platform, duration_mins: 2 }),
      });
      if (!res.ok) {
        const e = await res.json();
        return toast('Error: ' + e.error, 'error');
      }
      toast('Spot booked for 2 minutes — resident earns 10 credits.', 'success');
      closePanel();
      loadSpots();
      loadBookings();
    } catch (_) {
      toast('Network error — could not complete booking.', 'error');
    } finally {
      bookBtn.disabled = false;
      bookBtn.textContent = 'Book This Spot (2 min)';
    }
  });
}

/* ── Neighbourhood filter & camera navigation ── */
const nbFilter = document.getElementById('filter-neighborhood');
if (nbFilter) {
  nbFilter.addEventListener('change', () => {
    const val = nbFilter.value;
    renderSpots(cachedSpots);

    if (map) {
      if (val === 'HSR Layout') {
        map.flyTo([12.9116, 77.6412], 14, { duration: 0.8 });
      } else if (val === 'Indiranagar') {
        map.flyTo([12.9784, 77.6408], 14, { duration: 0.8 });
      } else if (val === 'Koramangala') {
        map.flyTo([12.9340, 77.6260], 14, { duration: 0.8 });
      } else {
        map.flyTo([12.9450, 77.6350], 12, { duration: 0.8 });
      }
    }
  });
}

/* ── SSE — Live spot updates ── */
function connectSSE() {
  const sse = new EventSource(`${API}/live`);
  sse.onmessage = e => {
    try {
      const data = JSON.parse(e.data);
      if (data && data.spots) {
        renderSpots(data.spots);
      }
    } catch (_) {}
  };
  sse.onerror = () => {
    const ind = document.getElementById('live-indicator');
    if (ind) {
      ind.textContent = 'Reconnecting';
      ind.className = 'status-badge off';
    }
    sse.close();
    setTimeout(connectSSE, 5000);
  };
  sse.onopen = () => {
    const ind = document.getElementById('live-indicator');
    if (ind) {
      ind.textContent = 'Radar Active';
      ind.className = 'status-badge on';
    }
  };
}

/* ── Zone heatmap circles — coloured by saturation from /agent/activity ── */
const ZONE_CENTRES = {
  'HSR Layout':  [12.9116, 77.6412],
  'Indiranagar': [12.9784, 77.6408],
  'Koramangala': [12.9340, 77.6260],
};
let zoneCircles = {};

function saturationColor(pct) {
  if (pct == null) return '#6f6f6f';
  if (pct >= 100) return '#da1e28';
  if (pct >= 60)  return '#f1c21b';
  return '#24a148';
}

async function updateZoneHeatmap() {
  if (!map || typeof L === 'undefined') return;
  try {
    const res = await fetch(`${API}/agent/activity`);
    if (!res.ok) return;
    const data = await res.json();

    Object.entries(ZONE_CENTRES).forEach(([zone, centre]) => {
      const thought = (data.recent_thoughts || []).find(t => t.zone && t.zone.startsWith(zone));
      const pctMatch = thought && thought.message.match(/(\d+)%/);
      const pct = pctMatch ? parseInt(pctMatch[1]) : 0;
      const color = saturationColor(pct);
      const label = `<b>${zone}</b><br>Saturation: ${pct}%<br>${pct >= 100 ? '⚠ Congested — dispatch throttled' : pct >= 60 ? '↑ Busy — stagger active' : '✓ Clear'}`;

      if (zoneCircles[zone]) {
        zoneCircles[zone].setStyle({ color, fillColor: color });
        zoneCircles[zone].setPopupContent(label);
      } else {
        zoneCircles[zone] = L.circle(centre, {
          radius: 600,
          color,
          fillColor: color,
          fillOpacity: 0.12,
          weight: 2,
          opacity: 0.55,
          dashArray: '6 4',
        }).addTo(map).bindPopup(label);
      }
    });
  } catch (_) {}
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadSpots();
  loadBookings();
  connectSSE();
  setInterval(loadBookings, 8000);
  // Heatmap: start after map has had a moment to initialize
  setTimeout(() => { updateZoneHeatmap(); setInterval(updateZoneHeatmap, 10000); }, 800);
});

// If DOM is already loaded (e.g. script loaded async or late)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initMap();
  loadSpots();
  loadBookings();
  connectSSE();
  setInterval(loadBookings, 8000);
  setTimeout(() => { updateZoneHeatmap(); setInterval(updateZoneHeatmap, 10000); }, 800);
}
