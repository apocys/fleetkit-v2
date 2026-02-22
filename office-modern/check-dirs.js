// Check which direction each group of 6 frames faces
// by looking at pixel distribution (facing down = more pixels at bottom, etc)
const sharp = require('sharp');

async function check(name, path) {
  const img = sharp(path);
  const meta = await img.metadata();
  const raw = await img.raw().toBuffer();
  const ch = meta.channels;
  const FW = 16, FH = 32, FPD = 6;
  
  console.log(`\n${name}: ${meta.width}×${meta.height} (${meta.width/FW} frames)`);
  
  for (let dir = 0; dir < 4; dir++) {
    const frame = dir * FPD; // first frame of each direction group
    const sx = frame * FW;
    
    // Count opaque pixels in top half vs bottom half
    let topPixels = 0, bottomPixels = 0;
    let leftPixels = 0, rightPixels = 0;
    
    for (let dy = 0; dy < FH; dy++) {
      for (let dx = 0; dx < FW; dx++) {
        const idx = (dy * meta.width + sx + dx) * ch;
        const a = ch >= 4 ? raw[idx + 3] : 255;
        if (a > 10) {
          if (dy < FH/2) topPixels++; else bottomPixels++;
          if (dx < FW/2) leftPixels++; else rightPixels++;
        }
      }
    }
    
    // Check head position - sample y=2 (top of head area) for skin color
    let headColor = '';
    for (let dx = 5; dx < 11; dx++) {
      const idx = (2 * meta.width + sx + dx) * ch;
      const a = ch >= 4 ? raw[idx + 3] : 255;
      if (a > 10) {
        headColor = `(${raw[idx]},${raw[idx+1]},${raw[idx+2]})`;
        break;
      }
    }
    
    // Check y=20 area for body facing
    let bodyColor = '';
    for (let dx = 5; dx < 11; dx++) {
      const idx = (20 * meta.width + sx + dx) * ch;
      const a = ch >= 4 ? raw[idx + 3] : 255;
      if (a > 10) {
        bodyColor = `(${raw[idx]},${raw[idx+1]},${raw[idx+2]})`;
        break;
      }
    }
    
    const bias = leftPixels > rightPixels ? 'LEFT-heavy' : rightPixels > leftPixels ? 'RIGHT-heavy' : 'CENTER';
    console.log(`  Dir ${dir} (frames ${frame}-${frame+FPD-1}): top=${topPixels} bot=${bottomPixels} L=${leftPixels} R=${rightPixels} ${bias} head=${headColor} body=${bodyColor}`);
  }
}

async function main() {
  const base = '/Users/apocys/.openclaw/workspace/fleetkit-v2/lib/sprites/modern-tiles-free/Modern tiles_Free/Characters_free';
  await check('Adam_run', `${base}/Adam_run_16x16.png`);
  await check('Adam_idle', `${base}/Adam_idle_anim_16x16.png`);
  await check('Amelia_run', `${base}/Amelia_run_16x16.png`);
}

main().catch(console.error);
