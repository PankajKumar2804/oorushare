-- Residential driveway / curb spots listed by residents
CREATE TABLE IF NOT EXISTS spots (
  id            SERIAL PRIMARY KEY,
  owner_name    TEXT NOT NULL,
  address       TEXT NOT NULL,
  neighborhood  TEXT NOT NULL DEFAULT 'HSR Layout',
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  gate_width_m  NUMERIC(4,1) NOT NULL DEFAULT 3.0,
  status        TEXT NOT NULL DEFAULT 'available',  -- available | booked | unavailable
  rwa_status    TEXT NOT NULL DEFAULT 'approved',   -- pending | approved | rejected
  available_from TIME,
  available_to   TIME,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rider slot bookings against a spot
CREATE TABLE IF NOT EXISTS bookings (
  id            SERIAL PRIMARY KEY,
  spot_id       INT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  rider_name    TEXT NOT NULL,
  rider_phone   TEXT,
  platform      TEXT NOT NULL DEFAULT 'Blinkit', -- Blinkit | Zepto | Swiggy | Dunzo
  booked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_mins INT NOT NULL DEFAULT 2,
  status        TEXT NOT NULL DEFAULT 'active'  -- active | completed | cancelled
);

-- Dark store dispatch queue entries
CREATE TABLE IF NOT EXISTS dispatch_queue (
  id            SERIAL PRIMARY KEY,
  store_name    TEXT NOT NULL,
  neighborhood  TEXT NOT NULL DEFAULT 'HSR Layout',
  rider_name    TEXT NOT NULL,
  platform      TEXT NOT NULL DEFAULT 'Blinkit',
  scheduled_at  TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | dispatched | completed
  spot_id       INT REFERENCES spots(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Community credit ledger for residents
CREATE TABLE IF NOT EXISTS credits (
  id            SERIAL PRIMARY KEY,
  owner_name    TEXT NOT NULL,
  spot_id       INT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  booking_id    INT REFERENCES bookings(id),
  credits       NUMERIC(8,2) NOT NULL DEFAULT 10.00,
  reason        TEXT NOT NULL DEFAULT 'Driveway share',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit redemptions for RWA maintenance discounts or utility credits
CREATE TABLE IF NOT EXISTS redemptions (
  id            SERIAL PRIMARY KEY,
  owner_name    TEXT NOT NULL,
  credits_used  NUMERIC(8,2) NOT NULL,
  inr_value     NUMERIC(8,2) NOT NULL,
  benefit_type  TEXT NOT NULL DEFAULT 'RWA_MAINTENANCE_OFFSET',
  status        TEXT NOT NULL DEFAULT 'approved', -- pending | approved | settled
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partner dispatch webhooks (Blinkit, Zepto, Swiggy)
CREATE TABLE IF NOT EXISTS partner_dispatches (
  id            SERIAL PRIMARY KEY,
  platform      TEXT NOT NULL,
  order_id      TEXT NOT NULL,
  rider_name    TEXT NOT NULL,
  dest_lat      DOUBLE PRECISION NOT NULL,
  dest_lng      DOUBLE PRECISION NOT NULL,
  allocated_spot_id INT REFERENCES spots(id),
  booking_id    INT REFERENCES bookings(id),
  status        TEXT NOT NULL DEFAULT 'dispatched', -- dispatched | arrived | completed | cancelled
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Single-column indexes (original)
CREATE INDEX IF NOT EXISTS idx_spots_neighborhood ON spots(neighborhood);
CREATE INDEX IF NOT EXISTS idx_spots_status       ON spots(status);
CREATE INDEX IF NOT EXISTS idx_bookings_spot_id   ON bookings(spot_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_store     ON dispatch_queue(store_name);
CREATE INDEX IF NOT EXISTS idx_credits_owner      ON credits(owner_name);

-- Composite indexes for high-traffic query paths
-- Rider map: GET /spots?neighborhood=X&status=available
CREATE INDEX IF NOT EXISTS idx_spots_nb_status
  ON spots(neighborhood, status)
  WHERE rwa_status = 'approved';

-- SSE live stream: SELECT ... FROM spots ORDER BY id  (covered by PK, no extra index needed)

-- Dispatch queue: stagger calculation (MAX scheduled_at per store with status=pending)
CREATE INDEX IF NOT EXISTS idx_queue_store_status_sched
  ON dispatch_queue(store_name, status, scheduled_at DESC)
  WHERE status = 'pending';

-- Dark store dashboard: GET /queue?status=pending ORDER BY scheduled_at
CREATE INDEX IF NOT EXISTS idx_queue_status_sched
  ON dispatch_queue(status, scheduled_at)
  WHERE status = 'pending';

-- Credits: GET /credits?owner_name=X ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_credits_owner_ts ON credits(owner_name, created_at DESC);

-- Bookings: GET /bookings ORDER BY booked_at DESC LIMIT 100
CREATE INDEX IF NOT EXISTS idx_bookings_ts ON bookings(booked_at DESC);

-- Spots by rwa_status for RWA admin dashboard
CREATE INDEX IF NOT EXISTS idx_spots_rwa_status ON spots(rwa_status, created_at DESC);
