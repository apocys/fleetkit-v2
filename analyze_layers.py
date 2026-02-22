#!/usr/bin/env python3
"""Decompose each grid cell into floor + furniture layers."""

from PIL import Image
import numpy as np
import json

MEDIA = "/Users/apocys/.openclaw/media"
SPRITES = "/Users/apocys/.openclaw/workspace/fleetkit-v2/lib/sprites/modern-office-revamped"

TILE = 32

# Load frame 0
frame0 = np.array(Image.open(f"{MEDIA}/office-design-2-frame0.png").convert("RGBA"))
h, w = frame0.shape[:2]
grid_w = w // TILE
grid_h = h // TILE

# Load all 6 frames
frames = []
for i in range(6):
    frames.append(np.array(Image.open(f"{MEDIA}/office-design-2-frame{i}.png").convert("RGBA")))

# Load tilesets at 32x32
rb = np.array(Image.open(f"{SPRITES}/1_Room_Builder_Office/Room_Builder_Office_32x32.png").convert("RGBA"))
mo = np.array(Image.open(f"{SPRITES}/Modern_Office_32x32.png").convert("RGBA"))
bs = np.array(Image.open(f"{SPRITES}/2_Modern_Office_Black_Shadow/Modern_Office_Black_Shadow_32x32.png").convert("RGBA"))

# Build tile lists
def get_tiles(sheet, name):
    tiles = []
    sh, sw = sheet.shape[:2]
    for r in range(sh // TILE):
        for c in range(sw // TILE):
            tile = sheet[r*TILE:(r+1)*TILE, c*TILE:(c+1)*TILE]
            tiles.append((name, c, r, tile))
    return tiles

rb_tiles = get_tiles(rb, 'RB')
mo_tiles = get_tiles(mo, 'MO')
bs_tiles = get_tiles(bs, 'BS')

# For floor tiles, use only RB tiles that are "full" (mostly opaque)
floor_tiles = []
for name, c, r, tile in rb_tiles:
    opaque = np.sum(tile[:,:,3] > 0)
    if opaque > TILE * TILE * 0.8:  # >80% opaque = likely a floor/wall tile
        floor_tiles.append((name, c, r, tile))

# For furniture/overlay tiles, use MO and BS tiles that are partially transparent
overlay_tiles = []
for name, c, r, tile in mo_tiles + bs_tiles:
    visible = np.sum(tile[:,:,3] > 0)
    if 0 < visible < TILE * TILE * 0.95:  # Has some transparency = overlay
        overlay_tiles.append((name, c, r, tile))
    elif visible >= TILE * TILE * 0.95:  # Fully opaque furniture tiles
        overlay_tiles.append((name, c, r, tile))

print(f"Floor tiles: {len(floor_tiles)}")
print(f"Overlay tiles: {len(overlay_tiles)}")

def alpha_composite(bg, fg):
    """Composite fg over bg, both RGBA uint8 arrays."""
    result = bg.copy().astype(np.float32)
    fg_f = fg.astype(np.float32)
    
    fg_a = fg_f[:,:,3:4] / 255.0
    bg_a = result[:,:,3:4] / 255.0
    
    out_a = fg_a + bg_a * (1 - fg_a)
    
    # Where output has alpha
    mask = out_a > 0
    result[:,:,:3] = np.where(
        mask,
        (fg_f[:,:,:3] * fg_a + result[:,:,:3] * bg_a * (1 - fg_a)) / np.maximum(out_a, 0.001),
        0
    )
    result[:,:,3:4] = out_a * 255
    
    return np.clip(result, 0, 255).astype(np.uint8)

def pixel_distance(a, b):
    """Average pixel distance between two RGBA tiles, considering alpha."""
    a_vis = a[:,:,3] > 0
    b_vis = b[:,:,3] > 0
    
    # Alpha mismatch penalty
    alpha_mismatch = np.sum(a_vis != b_vis)
    
    # RGB distance where both visible
    both = a_vis & b_vis
    if not np.any(both):
        if alpha_mismatch == 0:
            return 0  # Both empty
        return 999
    
    diff = np.abs(a[:,:,:3].astype(np.float32) - b[:,:,:3].astype(np.float32))
    rgb_dist = np.mean(diff[both])
    
    return rgb_dist + alpha_mismatch * 0.5

# For each grid cell, try: floor only, floor + overlay
print("\n=== LAYER DECOMPOSITION ===")

full_grid = []

for gy in range(grid_h):
    for gx in range(grid_w):
        px = gx * TILE
        py = gy * TILE
        target = frame0[py:py+TILE, px:px+TILE]
        
        if np.all(target[:,:,3] == 0):
            full_grid.append({'gx': gx, 'gy': gy, 'layers': []})
            continue
        
        # Find best single tile match
        best_single_dist = 999
        best_single = None
        for name, c, r, tile in rb_tiles + mo_tiles:
            d = pixel_distance(target, tile)
            if d < best_single_dist:
                best_single_dist = d
                best_single = (name, c, r)
        
        # Find best floor + overlay combo
        # First find the best floor tile
        best_floor_dist = 999
        best_floor = None
        best_floor_tile = None
        for name, c, r, tile in floor_tiles:
            d = pixel_distance(target, tile)
            if d < best_floor_dist:
                best_floor_dist = d
                best_floor = (name, c, r)
                best_floor_tile = tile
        
        # Then find the best overlay on top of that floor
        best_combo_dist = best_floor_dist  # Start with floor-only
        best_overlay = None
        
        if best_floor_tile is not None and best_floor_dist > 3:
            # Try adding overlays
            for name, c, r, tile in overlay_tiles:
                composite = alpha_composite(best_floor_tile, tile)
                d = pixel_distance(target, composite)
                if d < best_combo_dist:
                    best_combo_dist = d
                    best_overlay = (name, c, r)
        
        layers = []
        if best_combo_dist < best_single_dist - 1 and best_overlay:
            # Two-layer match is better
            layers.append({'sheet': best_floor[0], 'col': best_floor[1], 'row': best_floor[2]})
            layers.append({'sheet': best_overlay[0], 'col': best_overlay[1], 'row': best_overlay[2]})
            dist = best_combo_dist
        else:
            # Single tile match
            layers.append({'sheet': best_single[0], 'col': best_single[1], 'row': best_single[2]})
            dist = best_single_dist
        
        full_grid.append({'gx': gx, 'gy': gy, 'layers': layers, 'dist': round(float(dist), 2)})
        
        # Progress
        if gx == 0:
            pass  # Print nothing for speed

# Print results
print("\n=== DECOMPOSED GRID ===")
for gy in range(grid_h):
    cells = [g for g in full_grid if g['gy'] == gy]
    cells.sort(key=lambda x: x['gx'])
    line = f"Row {gy:2d}: "
    for cell in cells:
        if not cell['layers']:
            line += " ---- "
        elif len(cell['layers']) == 1:
            l = cell['layers'][0]
            d = cell.get('dist', 0)
            marker = '!' if d > 5 else ' '
            line += f"{marker}{l['sheet']}({l['col']:2d},{l['row']:2d})"
        else:
            l1 = cell['layers'][0]
            l2 = cell['layers'][1]
            d = cell.get('dist', 0)
            marker = '!' if d > 5 else ' '
            line += f"{marker}{l1['sheet'][0]}{l1['col']},{l1['row']}+{l2['sheet'][0]}{l2['col']},{l2['row']} "
        line += " "
    print(line)

# Animated tile analysis
print("\n=== ANIMATED TILES (per-frame matching) ===")
for gy in range(grid_h):
    for gx in range(grid_w):
        px = gx * TILE
        py = gy * TILE
        
        # Check if this cell changes across frames
        tiles = [f[py:py+TILE, px:px+TILE] for f in frames]
        changes = any(not np.array_equal(tiles[0], tiles[i]) for i in range(1, 6))
        if not changes:
            continue
        
        print(f"\nAnimated ({gx},{gy}):")
        # Show pixel differences
        for i in range(1, 6):
            diff = np.sum(np.any(tiles[0] != tiles[i], axis=2))
            print(f"  Frame 0 vs {i}: {diff} changed pixels")
        
        # Find what changes in the pixel data
        # Get bounding box of changes
        all_changes = np.zeros((TILE, TILE), dtype=bool)
        for i in range(1, 6):
            all_changes |= np.any(tiles[0] != tiles[i], axis=2)
        changed_pixels = np.argwhere(all_changes)
        if len(changed_pixels) > 0:
            min_y, min_x = changed_pixels.min(axis=0)
            max_y, max_x = changed_pixels.max(axis=0)
            print(f"  Change region: ({min_x},{min_y})-({max_x},{max_y})")

# Save full grid
output = {
    'tileSize': TILE,
    'gridW': grid_w,
    'gridH': grid_h,
    'canvasW': w,
    'canvasH': h,
    'cells': full_grid,
    'note': '32x32 tiles from RB/MO/BS tilesets'
}

with open('/Users/apocys/.openclaw/workspace/fleetkit-v2/office2_layers.json', 'w') as f:
    json.dump(output, f, indent=2)

print("\nSaved to office2_layers.json")

# Count quality
good = sum(1 for g in full_grid if g.get('dist', 999) <= 3)
ok = sum(1 for g in full_grid if 3 < g.get('dist', 999) <= 10)
bad = sum(1 for g in full_grid if g.get('dist', 999) > 10)
empty = sum(1 for g in full_grid if not g['layers'])
print(f"\nQuality: {good} good (<=3), {ok} ok (3-10), {bad} bad (>10), {empty} empty")
