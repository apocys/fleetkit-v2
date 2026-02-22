#!/usr/bin/env python3
"""Comprehensive 32x32 tile analysis with layer detection and animation tracking."""

from PIL import Image
import numpy as np
import json

MEDIA = "/Users/apocys/.openclaw/media"
SPRITES = "/Users/apocys/.openclaw/workspace/fleetkit-v2/lib/sprites/modern-office-revamped"

# Load all 6 frames
frames = []
for i in range(6):
    frames.append(np.array(Image.open(f"{MEDIA}/office-design-2-frame{i}.png").convert("RGBA")))
h, w = frames[0].shape[:2]
TILE = 32
grid_w = w // TILE  # 16
grid_h = h // TILE  # 17

# Load 32x32 tilesets
rb32 = np.array(Image.open(f"{SPRITES}/1_Room_Builder_Office/Room_Builder_Office_32x32.png").convert("RGBA"))
mo32 = np.array(Image.open(f"{SPRITES}/Modern_Office_32x32.png").convert("RGBA"))
bs32 = np.array(Image.open(f"{SPRITES}/2_Modern_Office_Black_Shadow/Modern_Office_Black_Shadow_32x32.png").convert("RGBA"))

# Build comprehensive DB
tile_data_db = []
for name, sheet in [('RB', rb32), ('MO', mo32), ('BS', bs32)]:
    sh, sw = sheet.shape[:2]
    cols = sw // TILE
    rows = sh // TILE
    print(f"{name}: {cols}x{rows} tiles ({sw}x{sh})")
    for r in range(rows):
        for c in range(cols):
            tile = sheet[r*TILE:(r+1)*TILE, c*TILE:(c+1)*TILE]
            # Only add non-empty tiles
            if np.any(tile[:,:,3] > 0):
                tile_data_db.append((name, c, r, tile))

print(f"Non-empty tiles: {len(tile_data_db)}")

# Better matching: use SSD (sum of squared differences) with alpha awareness
def match_score(target, candidate, tolerance=20):
    """Score how well candidate matches target. Returns (score, coverage)."""
    t_a = target[:,:,3] > 0
    c_a = candidate[:,:,3] > 0
    
    # Where both visible
    both = t_a & c_a
    if not np.any(both):
        if not np.any(t_a) and not np.any(c_a):
            return 1.0, 0.0  # Both empty
        return 0.0, 0.0
    
    # RGB distance where both visible
    t_rgb = target[:,:,:3].astype(np.float32)
    c_rgb = candidate[:,:,:3].astype(np.float32)
    diff = np.sqrt(np.sum((t_rgb - c_rgb)**2, axis=2))  # Euclidean per pixel
    
    # Score: fraction of pixels within tolerance
    close = (diff[both] <= tolerance)
    score = np.mean(close)
    coverage = np.sum(c_a) / (TILE * TILE)
    
    return float(score), float(coverage)

def find_best_matches(target, db, n=3, tolerance=20):
    """Find top N matches from DB."""
    results = []
    for name, c, r, tile in db:
        score, cov = match_score(target, tile, tolerance)
        combined = score * (0.3 + 0.7 * cov)  # Weight coverage
        results.append((combined, score, cov, name, c, r))
    results.sort(reverse=True)
    return results[:n]

# First: detect animated tiles by comparing frames
print("\n=== ANIMATED TILES ===")
animated_positions = []
for gy in range(grid_h):
    for gx in range(grid_w):
        px = gx * TILE
        py = gy * TILE
        tiles = [f[py:py+TILE, px:px+TILE] for f in frames]
        
        # Check if any frame differs from frame 0
        changed = False
        for i in range(1, 6):
            if not np.array_equal(tiles[0], tiles[i]):
                changed = True
                break
        
        if changed:
            # Find which frames are different
            unique_frames = []
            for i in range(6):
                is_dup = False
                for j in range(len(unique_frames)):
                    if np.array_equal(tiles[i], tiles[unique_frames[j]]):
                        is_dup = True
                        break
                if not is_dup:
                    unique_frames.append(i)
            
            print(f"  ({gx:2d},{gy:2d}) - {len(unique_frames)} unique frames out of 6")
            animated_positions.append((gx, gy, unique_frames))

# Match ALL tiles from frame 0
print("\n=== FULL GRID MATCHING ===")
grid_map = {}  # (gx,gy) -> best match info

for gy in range(grid_h):
    for gx in range(grid_w):
        px = gx * TILE
        py = gy * TILE
        target = frames[0][py:py+TILE, px:px+TILE]
        
        if np.all(target[:,:,3] == 0):
            grid_map[(gx,gy)] = {'type': 'empty'}
            continue
        
        # Find best matches
        matches = find_best_matches(target, tile_data_db, n=3, tolerance=20)
        
        if matches[0][0] > 0.7:
            combined, score, cov, name, c, r = matches[0]
            grid_map[(gx,gy)] = {
                'type': 'match',
                'sheet': name, 'col': c, 'row': r,
                'score': round(score, 3), 'coverage': round(cov, 3),
                'combined': round(combined, 3)
            }
        else:
            # Try overlay matching: floor tile + furniture tile
            grid_map[(gx,gy)] = {
                'type': 'partial',
                'best': [(round(m[0],2), round(m[1],2), round(m[2],2), m[3], m[4], m[5]) for m in matches[:3]]
            }

# Print nice grid
print("\n=== GRID MAP (Frame 0) ===")
print(f"{'':>7}", end='')
for gx in range(grid_w):
    print(f"  col{gx:2d}  ", end='')
print()

for gy in range(grid_h):
    print(f"Row {gy:2d}: ", end='')
    for gx in range(grid_w):
        info = grid_map.get((gx,gy), {})
        t = info.get('type', '?')
        if t == 'empty':
            print("  ----  ", end='')
        elif t == 'match':
            s = info['sheet']
            c = info['col']
            r = info['row']
            sc = info['combined']
            print(f"{s}({c:2d},{r:2d})", end='')
        else:
            best = info.get('best', [])
            if best:
                sc = best[0][0]
                print(f" ?{sc:.0%}?  ", end='')
            else:
                print("  ????  ", end='')
    print()

# Now, for the animated tiles, find matches for each frame
print("\n=== ANIMATED TILE DETAILS ===")
animated_data = []
for gx, gy, unique_frames in animated_positions:
    print(f"\nPosition ({gx},{gy}):")
    frame_matches = []
    for fi in range(6):
        px = gx * TILE
        py = gy * TILE
        target = frames[fi][py:py+TILE, px:px+TILE]
        matches = find_best_matches(target, tile_data_db, n=1, tolerance=20)
        if matches[0][0] > 0.5:
            combined, score, cov, name, c, r = matches[0]
            print(f"  Frame {fi}: {name}({c},{r}) score={score:.1%} cov={cov:.1%}")
            frame_matches.append({'sheet': name, 'col': c, 'row': r, 'score': round(score, 3)})
        else:
            print(f"  Frame {fi}: NO_MATCH best={matches[0][0]:.1%}")
            frame_matches.append(None)
    animated_data.append({'gx': gx, 'gy': gy, 'frames': frame_matches})

# Save comprehensive results
output = {
    'tileSize': TILE,
    'gridW': grid_w,
    'gridH': grid_h,
    'canvasW': w,
    'canvasH': h,
    'grid': {},
    'animated': animated_data
}

for (gx,gy), info in grid_map.items():
    key = f"{gx},{gy}"
    if info['type'] == 'match':
        output['grid'][key] = {
            'sheet': info['sheet'],
            'col': info['col'],
            'row': info['row'],
            'score': info['score']
        }
    elif info['type'] == 'empty':
        output['grid'][key] = {'sheet': 'EMPTY'}
    else:
        output['grid'][key] = {'sheet': 'UNKNOWN', 'best': info.get('best', [])}

with open('/Users/apocys/.openclaw/workspace/fleetkit-v2/office2_grid.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f"\nSaved to office2_grid.json")

# Summary
matched = sum(1 for v in grid_map.values() if v['type'] == 'match')
empty = sum(1 for v in grid_map.values() if v['type'] == 'empty')
partial = sum(1 for v in grid_map.values() if v['type'] == 'partial')
print(f"\nSummary: {matched} matched, {empty} empty, {partial} partial, {len(animated_positions)} animated")
