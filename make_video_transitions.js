/**
 * OoruShare Demo Video — with xfade crossfade transitions between every scene
 * Uses ffmpeg xfade filter chain to blend scenes with 0.5s fade
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const FFMPEG = 'C:\\Users\\panka\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe';
const SHOTS  = path.join(__dirname, 'screenshots');
const OUT    = path.join(__dirname, 'OoruShare_Demo_Transitions.mp4');

// [filename, hold duration in seconds] — total = sum + (n-1)*0.5 fade overlap
const SCENES = [
  ['01_hero.png',               8],
  ['02_problem_cards.png',     10],
  ['03_bento_grid.png',         8],
  ['04_bob_callout.png',        9],
  ['05_persona_cards.png',      6],
  ['06_resident_priya.png',     8],
  ['07_resident_rajan.png',     5],
  ['08_rider_map_full.png',     8],
  ['09_rider_booking_panel.png',5],
  ['10_rider_booked_toast.png', 5],
  ['11_darkstore_queue.png',    8],
  ['12_darkstore_surge.png',    7],
  ['13_rwa_overview.png',       5],
  ['14_rwa_pending.png',        5],
  ['15_rwa_approved.png',       5],
  ['16_rwa_credit_ledger.png',  5],
  ['17_telemetry_panel.png',   12],
  ['18_agent_tour_modal.png',  18],
  ['19_agent_tour_result.png', 17],
  ['20_bob_story_final.png',   15],
  ['21_footer_final.png',      16],
];

const FADE   = 0.5;  // crossfade duration seconds
const N      = SCENES.length;

// Build -i inputs
const inputs = SCENES.map(([f]) =>
  `-loop 1 -t ${SCENES[SCENES.indexOf(SCENES.find(s=>s[0]===f))][1] + FADE} -i "${path.join(SHOTS,f)}"`
).join(' ');

// Build xfade filter chain
// Each stream needs to be scaled/padded first, then chained with xfade
let filterParts = [];
// Scale all inputs to 1920x1080 first
for (let i = 0; i < N; i++) {
  filterParts.push(`[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#161616,setsar=1,fps=25[v${i}]`);
}

// Chain xfades: offset = sum of previous durations (not including fade)
let xfadeChain = [];
let currentLabel = 'v0';
let offset = 0;
for (let i = 0; i < N - 1; i++) {
  offset += SCENES[i][1];  // accumulate hold time
  const nextLabel = `v${i+1}`;
  const outLabel  = i === N - 2 ? 'vout' : `xf${i}`;
  xfadeChain.push(`[${currentLabel}][${nextLabel}]xfade=transition=fade:duration=${FADE}:offset=${offset}[${outLabel}]`);
  currentLabel = outLabel;
  // offset doesn't include the fade overlap (xfade handles that)
}

const filterComplex = [...filterParts, ...xfadeChain].join('; ');

const totalSecs = SCENES.reduce((s, [,d]) => s + d, 0);
const mm = Math.floor(totalSecs / 60);
const ss = totalSecs % 60;
console.log(`\n🎬  Building ${N} scenes with ${FADE}s crossfade transitions → ~${mm}m ${ss}s`);
console.log(`📁  Output: ${OUT}\n`);

const cmd = [
  `"${FFMPEG}"`,
  '-y',
  inputs,
  `-filter_complex "${filterComplex}"`,
  '-map "[vout]"',
  '-c:v libx264',
  '-preset fast',
  '-crf 18',
  '-pix_fmt yuv420p',
  '-r 25',
  `"${OUT}"`
].join(' ');

try {
  execSync(cmd, { stdio: 'inherit' });
  const sizeMB = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅  Video with transitions: ${OUT}`);
  console.log(`📦  Size: ${sizeMB} MB · Duration: ~${mm}m ${ss}s`);
  console.log(`\n💡  Add voiceover in Clipchamp or merge an MP3 with ffmpeg.`);
} catch (e) {
  console.error('\n❌  ffmpeg failed:', e.message.slice(0, 300));
}
