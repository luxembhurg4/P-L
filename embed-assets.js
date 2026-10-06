#!/usr/bin/env node
/**
 * embed-assets.js
 *   Inlines the 4 scene images + 3 transition videos from Assets/ into
 *   index.html as base64 data URIs, replacing the marker block.
 *
 *   Run:  node embed-assets.js
 *
 *   Re-run any time you swap files in Assets/. The script rewrites the
 *   __DATA_URIS__ ... __END_DATA_URIS__ section of index.html in place.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;
const HTML_PATH = path.join(ROOT, 'index.html');
const ASSETS    = path.join(ROOT, 'Assets');

const FILES = [
  // scene images
  { marker: 'SCENE1_B64',  file: 'Scene1.jpg'   },
  { marker: 'SCENE2_B64',  file: 'Scene2.jpg'   },
  { marker: 'SCENE3_B64',  file: 'Scene3.jpeg'  },
  { marker: 'SCENE4_B64',  file: 'Scene4.jpg'   },
  // transition videos (muted, no audio)
  { marker: 'TRANS12_B64', file: 'Transition1-2.mp4' },
  { marker: 'TRANS23_B64', file: 'Transition2-3.mp4' },
  { marker: 'TRANS34_B64', file: 'Transition3-4.mp4' },
];

const mime = {
  '.jpg'  : 'image/jpeg',
  '.jpeg' : 'image/jpeg',
  '.mp4'  : 'video/mp4',
};

function ext(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

let html;
try {
  html = fs.readFileSync(HTML_PATH, 'utf8');
} catch (e) {
  console.error('Cannot read index.html:', e.message);
  process.exit(1);
}

// Verify the marker block exists
const START_MARKER = '__DATA_URIS__';
const END_MARKER   = '__END_DATA_URIS__';
const startIdx = html.indexOf(START_MARKER);
const endIdx   = html.indexOf(END_MARKER);
if (startIdx < 0 || endIdx < 0 || endIdx < startIdx) {
  console.error('index.html must contain a __DATA_URIS__ ... __END_DATA_URIS__ block.');
  process.exit(1);
}

const out = { updated: false };

for (const { marker, file } of FILES) {
  const filePath = path.join(ASSETS, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing asset: ${file} (expected at ${filePath})`);
    process.exit(1);
  }
  const buf = fs.readFileSync(filePath);
  const mimeType = mime[ext(file)] || 'application/octet-stream';
  const b64 = buf.toString('base64');
  const uri = `data:${mimeType};base64,${b64}`;

  // Replace the marker token wherever it appears in the file
  const token = `__${marker}__`;
  if (!html.includes(token)) {
    console.warn(`Marker ${token} not found in index.html — skipping ${file}.`);
    continue;
  }
  html = html.split(token).join(uri);
  out.updated = true;
  console.log(`Embedded ${file} as ${mimeType}  (${buf.length.toLocaleString()} bytes raw, ${b64.length.toLocaleString()} chars base64)`);
}

if (!out.updated) {
  console.log('Nothing to do — all assets already embedded.');
  process.exit(0);
}

// Keep the marker comments as documentation; do NOT remove them.
// (embed-assets.js only replaces the __*__ tokens, not the comment block.)

fs.writeFileSync(HTML_PATH, html, 'utf8');
console.log('\nDone — index.html is now self-contained with embedded scene images and transition videos.');
console.log(`File size: ${(fs.statSync(HTML_PATH).size / 1024 / 1024).toFixed(2)} MB`);
