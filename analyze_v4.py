#!/usr/bin/env python3
"""Check if GIF uses 32x32 tiles."""

from PIL import Image
import numpy as np

MEDIA = "/Users/apocys/.openclaw/media"
SPRITES = "/Users/apocys/.openclaw/workspace/fleetkit-v2/lib/sprites/modern-office-revamped"

# Load frame 0
frame0 = np.array(Image.open(f"{MEDIA}/office-design-2-frame0.png").convert("RGBA"))
h, w = frame0.shape[:2]
print(f"Frame: {w}x{h}")

# Load 32x32 tilesets
rb32 = np.array(Image.open(f"{SPRITES}/1_Room_Builder_Office/Room_Builder_Office_32x32.png").convert("RGBA"))
mo32 = np.array(Image.open(f"{SPRITES}/Modern_Office_32x32.png").convert("RGBA"))
bs32 = np.array(Image.open(f"{SPRITES}/2_Modern_Office_Black_Shadow/Modern_Office_Black_Shadow_32x32.png").convert("RGBA"))

print(f"RB 32x32: {rb32.shape[1]}x{rb32.shape[0]} ({rb32.shape[1]//32}x{rb32.shape[0]//32} tiles)")
print(f"MO 32x32: {mo32.shape[1]}x{mo32.shape[0]} ({mo32.shape[1]//32}x{mo32.shape[0]//32} tiles)")
print(f"BS 32x32: {bs32.shape[1]}x{bs32.shape[0]} ({bs32.shape[1]//32}x{bs32.shape[0]//32} tiles)")

# GIF grid: 512/32 = 16 cols, 544/32 = 17 rows
TILE = 32
grid_w = w // TILE  # 16
grid_h = h // TILE  # 17
print(f"\nGrid: {grid_w}x{grid_h} (remainder: {w%TILE}x{h%TILE})")

# Build tile hash database for fast matching
def tile_hash(tile):
    """Hash a tile's pixel data."""
    return hash(tile.tobytes())

# Build DB
tile_db = {}  # hash -> (sheet, col, row)
tile_data_db = []  # list of (sheet, col, row, data)

for name, sheet in [('RB', rb32), ('MO', mo32), ('BS', bs32)]:
    sh, sw = sheet.shape[:2]
    cols = sw // TILE
    rows = sh // TILE
    for r in range(rows):
        for c in range(cols):
            tile = sheet[r*TILE:(r+1)*TILE, c*TILE:(c+1)*TILE]
            h_val = tile_hash(tile)
            tile_db[h_val] = (name, c, r)
            tile_data_db.append((name, c, r, tile))

print(f"Total tiles in DB: {len(tile_data_db)}")

# Try exact hash match first
exact_matches = 0
for gy in range(grid_h):
    for gx in range(grid_w):
        px = gx * TILE
        py = gy * TILE
        target = frame0[py:py+TILE, px:px+TILE]
        h_val = tile_hash(target)
        if h_val in tile_db:
            exact_matches += 1

print(f"\nExact hash matches: {exact_matches}/{grid_w*grid_h}")

# Try approximate match with tolerance
def approx_match(target, candidate, tolerance=5):
    """Match considering both alpha and color tolerance."""
    # Where both have content
    t_a = target[:,:,3]
    c_a = candidate[:,:,3]
    
    # Alpha must match
    alpha_match = (t_a == c_a) | ((t_a > 0) == (c_a > 0))
    
    # For visible pixels, check RGB within tolerance
    both_visible = (t_a > 0) & (c_a > 0)
    if not np.any(both_visible):
        # If both all transparent
        if np.all(t_a == 0) and np.all(c_a == 0):
            return 1.0
        return 0.0
    
    t_rgb = target[:,:,:3].astype(np.int16)
    c_rgb = candidate[:,:,:3].astype(np.int16)
    diff = np.max(np.abs(t_rgb - c_rgb), axis=2)
    
    rgb_close = diff <= tolerance
    visible_match = np.sum(rgb_close & both_visible)
    total_visible = np.sum(both_visible)
    
    # Also penalize alpha mismatches
    alpha_mismatch = np.sum((t_a > 0) != (c_a > 0))
    
    score = visible_match / total_visible if total_visible > 0 else 0
    penalty = alpha_mismatch / (TILE * TILE)
    
    return max(0, score - penalty)

# Full grid matching with tolerance
print(f"\nFull grid matching with tolerance=15...")
grid_results = []
for gy in range(grid_h):
    row_results = []
    for gx in range(grid_w):
        px = gx * TILE
        py = gy * TILE
        target = frame0[py:py+TILE, px:px+TILE]
        
        if np.all(target[:,:,3] == 0):
            row_results.append(('EMPTY', 1.0))
            continue
        
        best_score = 0
        best_match = None
        for name, c, r, tile in tile_data_db:
            score = approx_match(target, tile, tolerance=15)
            if score > best_score:
                best_score = score
                best_match = (name, c, r)
        
        row_results.append((best_match, best_score))
    grid_results.append(row_results)

# Print results
print("\n=== GRID RESULTS ===")
for gy, row in enumerate(grid_results):
    line = f"Row {gy:2d}: "
    for gx, (match, score) in enumerate(row):
        if match == 'EMPTY':
            line += "  EMPTY "
        elif match and score > 0.7:
            name, c, r = match
            line += f"{name}({c:2d},{r:2d})"
        else:
            line += f" ??{score:.0%} "
    print(line)

# Count
good = sum(1 for row in grid_results for m, s in row if m and (m == 'EMPTY' or s > 0.7))
total = grid_w * grid_h
print(f"\nGood matches (>70%): {good}/{total}")
