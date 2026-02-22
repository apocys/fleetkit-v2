#!/usr/bin/env node
// Analyze spritesheets to find which tiles have content and what color they are
// Uses sharp for image reading

const fs = require('fs');
const path = require('path');

// We'll use raw PNG decoding since sharp might not be installed
// Use canvas-less approach: just read pixel data from PNG

async function analyzePNG(filePath, label) {
  // Use sharp if available, otherwise use Jimp-like approach
  let sharp;
  try { sharp = require('sharp'); } catch(e) {}
  
  if (!sharp) {
    console.log(`Sharp not available, using alternative...`);
    // Use native node to spawn identify
    const { execSync } = require('child_process');
    try {
      const info = execSync(`sips -g pixelWidth -g pixelHeight "${filePath}" 2>/dev/null`).toString();
      console.log(`${label}: ${info.trim()}`);
    } catch(e) {}
    return;
  }
  
  const img = sharp(filePath);
  const meta = await img.metadata();
  const { width, height } = meta;
  const T = 16;
  const cols = Math.floor(width / T);
  const rows = Math.floor(height / T);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${label}`);
  console.log(`${width}×${height}px = ${cols}c × ${rows}r (${cols*rows} tiles)`);
  console.log(`${'='.repeat(60)}`);
  
  const raw = await img.raw().toBuffer();
  const channels = meta.channels || 4;
  
  function getTileInfo(col, row) {
    let filledPixels = 0;
    let rSum = 0, gSum = 0, bSum = 0;
    
    for (let dy = 0; dy < T; dy++) {
      for (let dx = 0; dx < T; dx++) {
        const px = col * T + dx;
        const py = row * T + dy;
        const idx = (py * width + px) * channels;
        const a = channels === 4 ? raw[idx + 3] : 255;
        if (a > 10) {
          filledPixels++;
          rSum += raw[idx];
          gSum += raw[idx + 1];
          bSum += raw[idx + 2];
        }
      }
    }
    
    if (filledPixels === 0) return null;
    
    return {
      filled: filledPixels,
      pct: Math.round(filledPixels / (T*T) * 100),
      r: Math.round(rSum / filledPixels),
      g: Math.round(gSum / filledPixels),
      b: Math.round(bSum / filledPixels),
    };
  }
  
  // Dump ALL non-empty tiles
  for (let r = 0; r < rows; r++) {
    const rowTiles = [];
    for (let c = 0; c < cols; c++) {
      const info = getTileInfo(c, r);
      if (info && info.pct > 5) {
        rowTiles.push(`c${c}:${info.pct}%(${info.r},${info.g},${info.b})`);
      }
    }
    if (rowTiles.length > 0) {
      console.log(`r${r}: ${rowTiles.join(' | ')}`);
    }
  }
}

async function main() {
  const base = '/Users/apocys/.openclaw/workspace/fleetkit-v2/lib/sprites';
  
  const sheets = [
    { path: `${base}/modern-tiles-free/Modern tiles_Free/Interiors_free/16x16/Room_Builder_free_16x16.png`, label: 'ROOM BUILDER FREE' },
    { path: `${base}/modern-office-revamped/1_Room_Builder_Office/Room_Builder_Office_16x16.png`, label: 'OFFICE ROOM BUILDER' },
    { path: `${base}/modern-tiles-free/Modern tiles_Free/Interiors_free/16x16/Interiors_free_16x16.png`, label: 'INTERIORS FREE' },
    { path: `${base}/modern-office-revamped/3_Modern_Office_Shadowless/Modern_Office_Shadowless_16x16.png`, label: 'MODERN OFFICE SHADOWLESS' },
  ];
  
  for (const s of sheets) {
    await analyzePNG(s.path, s.label);
  }
}

main().catch(console.error);
