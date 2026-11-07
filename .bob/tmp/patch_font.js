const fs = require('fs');
const path = require('path');
const os = require('os');

const pptxSrc = 'c:\\Users\\panka\\oorushare\\OoruShare_IBM_Bobathon_Theme1_Submission.pptx';
const tmpDir = path.join(os.tmpdir(), 'pptx_patch_' + Date.now());
const tmpZip = pptxSrc.replace('.pptx', '_tmp.zip');

// Copy pptx as zip
fs.copyFileSync(pptxSrc, tmpZip);

// Use adm-zip if available, else use built-in
try {
  // Try node built-in approach: read as buffer, find theme XML, patch, write back
  // PPTX is a ZIP - use yauzl/archiver or manual zip manipulation
  // Simplest: use the existing extracted content from .bob/tmp/pptx-inspect
  const extractPath = 'c:\\Users\\panka\\oorushare\\.bob\\tmp\\pptx-inspect';
  const themeFile = path.join(extractPath, 'ppt', 'theme', 'theme1.xml');
  
  let xml = fs.readFileSync(themeFile, 'utf8');
  xml = xml.replace(/(<a:majorFont><a:latin typeface=")Calibri(")/, '$1IBM Plex Sans$2');
  xml = xml.replace(/(<a:minorFont><a:latin typeface=")Calibri(")/, '$1IBM Plex Sans$2');
  
  const ibmCount = (xml.match(/IBM Plex Sans/g) || []).length;
  console.log('IBM Plex Sans occurrences:', ibmCount);
  
  fs.writeFileSync(themeFile, xml, 'utf8');
  console.log('Theme XML patched in extracted dir');
} catch(e) {
  console.error(e.message);
}
