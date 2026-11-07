'use strict';
const fs = require('fs');
const path = require('path');
const { unzipSync, strToU8, zipSync } = require('fflate');

const pptxPath = path.resolve(__dirname, '../../oorushare/OoruShare_IBM_Bobathon_Theme1_Submission.pptx');

const buf = fs.readFileSync(pptxPath);
const files = unzipSync(buf);

// Find and patch the theme XML
let patched = 0;
for (const [name, data] of Object.entries(files)) {
  if (/^ppt\/theme\/theme\d+\.xml$/.test(name)) {
    let xml = Buffer.from(data).toString('utf8');
    const before = xml;
    xml = xml
      .replace(/(<a:majorFont><a:latin typeface=")Calibri(")/, '$1IBM Plex Sans$2')
      .replace(/(<a:minorFont><a:latin typeface=")Calibri(")/, '$1IBM Plex Sans$2');
    if (xml !== before) {
      files[name] = strToU8(xml);
      patched++;
      console.log(`Patched: ${name}`);
    }
  }
}

if (patched === 0) {
  console.error('No theme file patched — check XML structure');
  process.exit(1);
}

const out = zipSync(files, { level: 6 });
fs.writeFileSync(pptxPath, out);
console.log(`Written: ${pptxPath} (${out.length} bytes)`);
