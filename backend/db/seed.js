// Seed HSR Layout demo spots + dispatch queue for hackathon demo
const { pool } = require('./migrate');

const DEMO_SPOTS = [
  { owner_name: 'Priya Sharma',    address: '14, 27th Main, HSR Layout Sec 1', neighborhood: 'HSR Layout',   lat: 12.9116, lng: 77.6412, gate_width_m: 3.5, available_from: '14:00', available_to: '17:00' },
  { owner_name: 'Rajan Nair',      address: '8B, 5th Cross, Indiranagar',       neighborhood: 'Indiranagar',  lat: 12.9784, lng: 77.6408, gate_width_m: 2.8, available_from: '11:00', available_to: '15:00' },
  { owner_name: 'Meena Patel',     address: '22, 80 Feet Rd, Koramangala',      neighborhood: 'Koramangala', lat: 12.9352, lng: 77.6245, gate_width_m: 4.0, available_from: '09:00', available_to: '12:00' },
  { owner_name: 'Suresh Kumar',    address: '3, 17th Cross, HSR Layout Sec 2',  neighborhood: 'HSR Layout',   lat: 12.9089, lng: 77.6389, gate_width_m: 3.0, available_from: '13:00', available_to: '16:00' },
  { owner_name: 'Anitha Reddy',    address: '7, 12th Main, Indiranagar',        neighborhood: 'Indiranagar',  lat: 12.9762, lng: 77.6421, gate_width_m: 3.2, available_from: '10:00', available_to: '14:00' },
  { owner_name: 'Vikram Shetty',   address: '45, 7th Block, Koramangala',       neighborhood: 'Koramangala', lat: 12.9328, lng: 77.6278, gate_width_m: 2.5, available_from: '15:00', available_to: '19:00' },
  { owner_name: 'Deepa Menon',     address: '11, 31st Cross, HSR Layout Sec 4', neighborhood: 'HSR Layout',   lat: 12.9141, lng: 77.6435, gate_width_m: 3.8, available_from: '08:00', available_to: '11:00' },
  { owner_name: 'Arjun Krishnan',  address: '2, 100 Feet Rd, Indiranagar',      neighborhood: 'Indiranagar',  lat: 12.9801, lng: 77.6389, gate_width_m: 4.5, available_from: '12:00', available_to: '18:00' },
];

const DEMO_QUEUE = [
  { store_name: 'Blinkit HSR',     neighborhood: 'HSR Layout',   rider_name: 'Ravi Kumar',    platform: 'Blinkit',  offset_mins: 0  },
  { store_name: 'Blinkit HSR',     neighborhood: 'HSR Layout',   rider_name: 'Sanjay Das',    platform: 'Blinkit',  offset_mins: 4  },
  { store_name: 'Blinkit HSR',     neighborhood: 'HSR Layout',   rider_name: 'Mohan Rao',     platform: 'Blinkit',  offset_mins: 8  },
  { store_name: 'Zepto Koramangala', neighborhood: 'Koramangala', rider_name: 'Kiran Singh',   platform: 'Zepto',    offset_mins: 2  },
  { store_name: 'Zepto Koramangala', neighborhood: 'Koramangala', rider_name: 'Arun Pillai',   platform: 'Zepto',    offset_mins: 6  },
  { store_name: 'Swiggy Indiranagar', neighborhood: 'Indiranagar', rider_name: 'Vijay Reddy',  platform: 'Swiggy',   offset_mins: 1  },
  { store_name: 'Swiggy Indiranagar', neighborhood: 'Indiranagar', rider_name: 'Ajith Kumar',  platform: 'Swiggy',   offset_mins: 5  },
];

async function seed() {
  // Clear existing seed data
  await pool.query('DELETE FROM dispatch_queue');
  await pool.query('DELETE FROM credits');
  await pool.query('DELETE FROM bookings');
  await pool.query('DELETE FROM spots');

  // Insert demo spots
  const spotIds = [];
  for (const s of DEMO_SPOTS) {
    const { rows } = await pool.query(
      `INSERT INTO spots (owner_name, address, neighborhood, lat, lng, gate_width_m, available_from, available_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [s.owner_name, s.address, s.neighborhood, s.lat, s.lng, s.gate_width_m, s.available_from, s.available_to]
    );
    spotIds.push(rows[0].id);
  }

  // Seed dispatch queue (staggered from now)
  const now = new Date();
  for (const q of DEMO_QUEUE) {
    const scheduledAt = new Date(now.getTime() + q.offset_mins * 60 * 1000);
    await pool.query(
      `INSERT INTO dispatch_queue (store_name, neighborhood, rider_name, platform, scheduled_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [q.store_name, q.neighborhood, q.rider_name, q.platform, scheduledAt]
    );
  }

  // Seed some credits for demo residents
  for (let i = 0; i < 3; i++) {
    await pool.query(
      `INSERT INTO credits (owner_name, spot_id, credits, reason) VALUES ($1,$2,$3,$4)`,
      [DEMO_SPOTS[i].owner_name, spotIds[i], (i + 1) * 10, 'Welcome bonus']
    );
  }

  console.log(`Seeded ${DEMO_SPOTS.length} spots, ${DEMO_QUEUE.length} queue entries`);
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
