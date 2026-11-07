/**
 * OoruShare Smooth Screen Capture
 * Takes 1 screenshot per second while actually scrolling/interacting
 * Result: ~240 frames → assembled into a 4-minute video at 1fps (smooth slideshow)
 * or 25fps with ffmpeg interpolation for cinematic feel
 */

const puppeteer = require('puppeteer');
const fs   = require('fs');
const path = require('path');

const BASE  = 'http://localhost:3001';
const OUT   = path.join(__dirname, 'frames');
const FFMPEG = 'C:\\Users\\panka\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe';

if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
fs.mkdirSync(OUT);

let frameIdx = 0;

const sleep  = ms => new Promise(r => setTimeout(r, ms));
const pad    = n  => String(n).padStart(5, '0');

async function capture(page, label) {
  const file = path.join(OUT, `frame_${pad(frameIdx++)}.png`);
  await page.screenshot({ path: file, fullPage: false });
  process.stdout.write(`\r📸 frame ${frameIdx} — ${label}        `);
}

// Continuously capture at ~1fps while doing something
async function captureFor(page, seconds, label) {
  for (let i = 0; i < seconds; i++) {
    await capture(page, label);
    await sleep(1000);
  }
}

// Scroll smoothly while capturing
async function scrollAndCapture(page, fromY, toY, steps, label) {
  const diff = toY - fromY;
  for (let i = 0; i <= steps; i++) {
    const y = fromY + Math.round((diff / steps) * i);
    await page.evaluate(y => window.scrollTo({ top: y }), y);
    await capture(page, label);
    await sleep(1000 / steps * 2); // faster than 1fps during scroll
  }
}

(async () => {
  console.log('\n🎬  OoruShare Smooth Capture — 1 frame/second\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // ── SCENE 1 · Hero (0–8s) ─────────────────────────────────────
  console.log('\n🎬 Scene 1 · Hero');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await captureFor(page, 6, 'hero');

  // Scroll down to problem cards
  await scrollAndCapture(page, 0, 600, 6, 'scroll-to-problem');
  await captureFor(page, 4, 'problem-cards');

  // ── SCENE 2 · Architecture (8–20s) ────────────────────────────
  console.log('\n🎬 Scene 2 · Architecture');
  await scrollAndCapture(page, 600, 1400, 6, 'scroll-to-bento');
  await captureFor(page, 5, 'bento-grid');

  await scrollAndCapture(page, 1400, 2200, 6, 'scroll-to-bob-callout');
  await captureFor(page, 6, 'bob-callout');

  await scrollAndCapture(page, 2200, 3000, 4, 'scroll-to-personas');
  await captureFor(page, 4, 'persona-cards');

  // ── SCENE 3a · Resident (20–32s) ──────────────────────────────
  console.log('\n🎬 Scene 3a · Resident');
  await page.goto(`${BASE}/resident.html`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await captureFor(page, 5, 'resident-priya');

  // Switch resident dropdown
  const selects = await page.$$('select');
  if (selects.length) {
    await selects[0].evaluate(sel => {
      const opts = Array.from(sel.options);
      const rajan = opts.find(o => o.text.includes('Rajan') || o.text.includes('Nair'));
      if (rajan) { sel.value = rajan.value; sel.dispatchEvent(new Event('change')); }
    });
    await sleep(800);
  }
  await captureFor(page, 4, 'resident-rajan');

  // Scroll to redeem button
  await scrollAndCapture(page, 0, 500, 4, 'scroll-to-redeem');
  await captureFor(page, 3, 'resident-credits');

  // ── SCENE 3b · Rider Map (32–45s) ─────────────────────────────
  console.log('\n🎬 Scene 3b · Rider Map');
  await page.goto(`${BASE}/rider.html`, { waitUntil: 'networkidle2' });
  await sleep(3000); // wait for map tiles
  await captureFor(page, 7, 'rider-map');

  // Click a pin
  const pins = await page.$$('.leaflet-marker-icon');
  if (pins.length > 0) {
    await pins[0].click();
    await sleep(800);
    await captureFor(page, 3, 'rider-pin-popup');

    // Book it
    const btns = await page.$$('button');
    for (const b of btns) {
      const t = await b.evaluate(e => e.textContent);
      if (t.includes('Book') || t.includes('Reserve')) { await b.click(); break; }
    }
    await sleep(800);
    await captureFor(page, 3, 'rider-booked');
  }

  // ── SCENE 3c · Dark Store (45–58s) ────────────────────────────
  console.log('\n🎬 Scene 3c · Dark Store');
  await page.goto(`${BASE}/darkstore.html`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await captureFor(page, 6, 'darkstore-queue');

  // Scroll to see queue details
  await scrollAndCapture(page, 0, 400, 3, 'scroll-darkstore');
  await captureFor(page, 3, 'darkstore-detail');

  // Simulate surge
  const dsBtns = await page.$$('button');
  for (const b of dsBtns) {
    const t = await b.evaluate(e => e.textContent);
    if (t.includes('Simulate') || t.includes('Surge')) { await b.click(); break; }
  }
  await sleep(800);
  await captureFor(page, 4, 'darkstore-surge');

  // ── SCENE 3d · RWA (58–73s) ───────────────────────────────────
  console.log('\n🎬 Scene 3d · RWA');
  await page.goto(`${BASE}/rwa.html`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await captureFor(page, 5, 'rwa-overview');

  // Click Pending
  const rwaBtns = await page.$$('button');
  for (const b of rwaBtns) {
    const t = await b.evaluate(e => e.textContent);
    if (t.includes('Pending')) { await b.click(); break; }
  }
  await sleep(800);
  await captureFor(page, 3, 'rwa-pending');

  // Approve one
  const approveBtns = await page.$$('button');
  for (const b of approveBtns) {
    const t = await b.evaluate(e => e.textContent);
    if (t.includes('Approve')) { await b.click(); break; }
  }
  await sleep(800);
  await captureFor(page, 3, 'rwa-approved');

  // Scroll to credit ledger
  await scrollAndCapture(page, 0, 800, 4, 'scroll-to-ledger');
  await captureFor(page, 4, 'rwa-ledger');

  // ── SCENE 4 · Telemetry (73–85s) ──────────────────────────────
  console.log('\n🎬 Scene 4 · Telemetry');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await page.evaluate(() => document.getElementById('city-dashboard')?.scrollIntoView());
  await sleep(1000);
  await captureFor(page, 10, 'telemetry');

  // ── SCENE 5 · Agent Tour (85–120s) ────────────────────────────
  console.log('\n🎬 Scene 5 · Agent Tour');
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await sleep(500);

  const tourBtns = await page.$$('button');
  for (const b of tourBtns) {
    const t = await b.evaluate(e => e.textContent);
    if (t.includes('Agent Tour')) { await b.click(); break; }
  }
  await sleep(1000);
  await captureFor(page, 8, 'agent-tour-animating');
  await sleep(2000);
  await captureFor(page, 12, 'agent-tour-result');

  // ── SCENE 6 · Closing (120–140s) ──────────────────────────────
  console.log('\n🎬 Scene 6 · Closing');
  await page.keyboard.press('Escape');
  await sleep(500);
  await page.evaluate(() => document.getElementById('agentic-loop')?.scrollIntoView());
  await sleep(800);
  await captureFor(page, 8, 'bob-story');

  await scrollAndCapture(page, 2000, 3500, 5, 'scroll-to-footer');
  await captureFor(page, 8, 'footer');

  await browser.close();

  const total = frameIdx;
  console.log(`\n\n✅  Captured ${total} frames → assembling video...\n`);

  // Assemble with ffmpeg — 1fps input, smooth 25fps output with minterpolate
  const { execSync } = require('child_process');
  const videoOut = path.join(__dirname, 'OoruShare_Demo_Transitions.mp4');

  const cmd = [
    `"${FFMPEG}" -y`,
    `-framerate 1`,
    `-i "${path.join(OUT, 'frame_%05d.png')}"`,
    `-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#161616,setsar=1,minterpolate=fps=25:mi_mode=blend"`,
    `-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p`,
    `"${videoOut}"`
  ].join(' ');

  try {
    execSync(cmd, { stdio: 'inherit' });
    const sizeMB = (fs.statSync(videoOut).size / 1024 / 1024).toFixed(1);
    const durSec = total;
    const mm = Math.floor(durSec / 60), ss = durSec % 60;
    console.log(`\n✅  Video ready: ${videoOut}`);
    console.log(`📦  ${sizeMB} MB · ${mm}m ${ss}s · smooth 25fps`);
    console.log(`\n💡  Open in any player. Add voiceover in Clipchamp.`);
  } catch(e) {
    console.error('❌  ffmpeg error:', e.message.slice(0,200));
  }
})();
