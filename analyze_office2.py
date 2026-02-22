#!/usr/bin/env python3
"""Analyze Office Design 2 GIF frames and match tiles to tilesheets."""

from PIL import Image
import numpy as np
import json
import os

# Paths
MEDIA = "/Users/apocys/.openclaw/media"
SPRITES = "/Users/apocys/.openclaw/workspace/fleetkit-v2/lib/sprites/modern-office-revamped"

# Load frames
frames = []
for i in range(6):
    path = f"{MEDIA}/office-design-2-frame{i}.png"
    img = Image.open(path).convert("RGBA")
    frames.append(np.array(img))
    print(f"Frame {i}: {img.size}")

# Load tilesheets
room_builder = np.array(Image.open(f"{SPRITES}/1_Room_Builder_Office/Room_Builder_Office_48x48.png").convert("RGBA"))
modern_office = np.array(Image.open(f"{SPRITES}/Modern_Office_48x48.png").convert("RGBA"))
black_shadow = np.array(Image.open(f"{SPRITES}/2_Modern_Office_Black_Shadow/Modern_Office_Black_Shadow_48x48.png").convert("RGBA"))

print(f"Room Builder: {room_builder.shape}")
print(f"Modern Office: {modern_office.shape}")
print(f"Black Shadow: {black_shadow.shape}")

# Frame dimensions
h, w = frames[0].shape[:2]
print(f"\nFrame size: {w}x{h}")

# First, find which tiles change between frames
print("\n=== FINDING ANIMATED REGIONS ===")
# Check every 48x48 grid position - but the GIF might not be aligned to 48px grid
# Let's check pixel differences between frames first

# Compare frame 0 vs frame 1
diff01 = np.any(frames[0] != frames[1], axis=2)
changed_pixels = np.argwhere(diff01)
if len(changed_pixels) > 0:
    min_y, min_x = changed_pixels.min(axis=0)
    max_y, max_x = changed_pixels.max(axis=0)
    print(f"Frame 0 vs 1: {len(changed_pixels)} changed pixels, bbox=({min_x},{min_y})-({max_x},{max_y})")

# Compare all consecutive frames
for i in range(5):
    diff = np.any(frames[i] != frames[i+1], axis=2)
    changed = np.argwhere(diff)
    if len(changed) > 0:
        min_y, min_x = changed.min(axis=0)
        max_y, max_x = changed.max(axis=0)
        print(f"Frame {i} vs {i+1}: {len(changed)} changed pixels, bbox=({min_x},{min_y})-({max_x},{max_y})")
    else:
        print(f"Frame {i} vs {i+1}: identical")

# Now, let's figure out the grid alignment
# The GIF is 512x544. With 48px tiles:
# 512/48 = 10.67 -> probably 11 columns with some offset
# 544/48 = 11.33 -> probably 12 rows with some offset
# Or it could be offset by some amount

# Let's try different offsets to find the best alignment
# First check: is there a consistent background color on edges?
frame0 = frames[0]
print(f"\nTop-left pixel: {frame0[0,0]}")
print(f"Top-right pixel: {frame0[0,-1]}")
print(f"Bottom-left pixel: {frame0[-1,0]}")
print(f"Bottom-right pixel: {frame0[-1,-1]}")

# Check if the image has transparent borders
# Look at alpha channel
alpha = frame0[:,:,3]
print(f"\nAlpha channel: min={alpha.min()}, max={alpha.max()}")

# Find non-transparent bounds
non_transparent = np.argwhere(alpha > 0)
if len(non_transparent) > 0:
    min_y, min_x = non_transparent.min(axis=0)
    max_y, max_x = non_transparent.max(axis=0)
    print(f"Non-transparent bounds: ({min_x},{min_y})-({max_x},{max_y})")
    print(f"Content size: {max_x-min_x+1}x{max_y-min_y+1}")

# Let's try grid offset (0,0) and (8,8) and (16,16) and (8,16) etc
# and compute how well tiles match
print("\n=== TILE MATCHING ===")

def extract_tile(img, x, y, size=48):
    """Extract a size x size region from img at pixel position (x,y)."""
    return img[y:y+size, x:x+size]

def compare_tiles(t1, t2):
    """Compare two tiles, return number of matching pixels (considering alpha)."""
    if t1.shape != t2.shape:
        return -1
    # Both must be RGBA
    # Only compare where both have alpha > 0
    both_visible = (t1[:,:,3] > 0) & (t2[:,:,3] > 0)
    if not np.any(both_visible):
        # Both transparent = match if t1 is all transparent
        if np.all(t1[:,:,3] == 0) and np.all(t2[:,:,3] == 0):
            return 48*48  # Perfect match for empty
        return 0
    # Compare RGB where both visible
    rgb_match = np.all(t1[:,:,:3] == t2[:,:,:3], axis=2) & both_visible
    # Also count where both are transparent
    both_transparent = (t1[:,:,3] == 0) & (t2[:,:,3] == 0)
    total_match = np.sum(rgb_match) + np.sum(both_transparent)
    return int(total_match)

# Build tile database from both tilesheets
print("Building tile database...")
tile_db = []

# Room Builder tiles
rb_h, rb_w = room_builder.shape[:2]
rb_cols, rb_rows = rb_w // 48, rb_h // 48
for r in range(rb_rows):
    for c in range(rb_cols):
        tile = extract_tile(room_builder, c*48, r*48)
        if tile.shape == (48, 48, 4):
            tile_db.append({
                'sheet': 'RB',
                'col': c,
                'row': r,
                'data': tile
            })

# Modern Office tiles
mo_h, mo_w = modern_office.shape[:2]
mo_cols, mo_rows = mo_w // 48, mo_h // 48
for r in range(mo_rows):
    for c in range(mo_cols):
        tile = extract_tile(modern_office, c*48, r*48)
        if tile.shape == (48, 48, 4):
            tile_db.append({
                'sheet': 'MO',
                'col': c,
                'row': r,
                'data': tile
            })

# Black Shadow tiles
bs_h, bs_w = black_shadow.shape[:2]
bs_cols, bs_rows = bs_w // 48, bs_h // 48
for r in range(bs_rows):
    for c in range(bs_cols):
        tile = extract_tile(black_shadow, c*48, r*48)
        if tile.shape == (48, 48, 4):
            tile_db.append({
                'sheet': 'BS',
                'col': c,
                'row': r,
                'data': tile
            })

print(f"Total tiles in database: {len(tile_db)}")

# Try to find tiles in frame 0 at grid positions
# Try offset (8, 16) - common offset in pixel art
# Actually let's try offset (0,0) first since the image starts at 0
# 512 = 10*48 + 32, so last column partial
# 544 = 11*48 + 16, so last row partial

# Let's try: the image might use a non-standard grid
# Better approach: search for exact tile matches at every position

# For each 48x48 region in frame 0, find the best matching tile
# Using grid with offset=0
print("\nMatching tiles at offset (0,0)...")

def find_best_match(target_tile, db, threshold=0.95):
    """Find the best matching tile in the database."""
    best_score = 0
    best_match = None
    total_pixels = 48 * 48
    
    for entry in db:
        score = compare_tiles(target_tile, entry['data'])
        if score > best_score:
            best_score = score
            best_match = entry
    
    if best_match and best_score >= total_pixels * threshold:
        return best_match, best_score / total_pixels
    return None, best_score / total_pixels

# Try the grid matching at offset (0,0)
grid_w = w // 48  # 10
grid_h = h // 48  # 11
remainder_w = w % 48  # 32
remainder_h = h % 48  # 16

print(f"Grid: {grid_w}x{grid_h} tiles + remainder {remainder_w}x{remainder_h}")

# Match every grid cell in frame 0
results = []
for gy in range(grid_h + (1 if remainder_h > 0 else 0)):
    for gx in range(grid_w + (1 if remainder_w > 0 else 0)):
        px = gx * 48
        py = gy * 48
        if px + 48 > w or py + 48 > h:
            continue
        target = extract_tile(frame0, px, py)
        
        # Check if tile is fully transparent
        if np.all(target[:,:,3] == 0):
            results.append({'gx': gx, 'gy': gy, 'match': 'EMPTY', 'score': 1.0})
            continue
            
        match, score = find_best_match(target, tile_db, threshold=0.90)
        if match:
            results.append({
                'gx': gx, 'gy': gy,
                'match': f"{match['sheet']}({match['col']},{match['row']})",
                'sheet': match['sheet'],
                'col': match['col'],
                'row': match['row'],
                'score': score
            })
        else:
            results.append({'gx': gx, 'gy': gy, 'match': 'NO_MATCH', 'score': score})

# Print grid
print("\n=== TILE GRID (Frame 0, offset 0,0) ===")
for gy in range(grid_h + 1):
    row_str = ""
    for gx in range(grid_w + 1):
        px = gx * 48
        py = gy * 48
        if px + 48 > w or py + 48 > h:
            row_str += "     ---- "
            continue
        r = next((r for r in results if r['gx'] == gx and r['gy'] == gy), None)
        if r:
            if r['match'] == 'EMPTY':
                row_str += "   EMPTY  "
            elif r['match'] == 'NO_MATCH':
                row_str += f"  NO({r['score']:.0%}) "
            else:
                row_str += f"{r['match']:>10s}"
        else:
            row_str += "     ----"
    print(f"Row {gy:2d}: {row_str}")

# Count matches
matched = sum(1 for r in results if r['match'] not in ('NO_MATCH', 'EMPTY'))
no_match = sum(1 for r in results if r['match'] == 'NO_MATCH')
empty = sum(1 for r in results if r['match'] == 'EMPTY')
print(f"\nMatched: {matched}, No Match: {no_match}, Empty: {empty}")

# Now find animated tiles
print("\n=== ANIMATED TILE DETECTION ===")
for gy in range(grid_h + 1):
    for gx in range(grid_w + 1):
        px = gx * 48
        py = gy * 48
        if px + 48 > w or py + 48 > h:
            continue
        
        # Check if this tile changes across frames
        tiles_across_frames = [extract_tile(f, px, py) for f in frames]
        changes = False
        for i in range(1, 6):
            if not np.array_equal(tiles_across_frames[0], tiles_across_frames[i]):
                changes = True
                break
        
        if changes:
            print(f"\nAnimated tile at grid ({gx},{gy}), pixel ({px},{py}):")
            for fi in range(6):
                match, score = find_best_match(tiles_across_frames[fi], tile_db, threshold=0.85)
                if match:
                    print(f"  Frame {fi}: {match['sheet']}({match['col']},{match['row']}) score={score:.1%}")
                else:
                    print(f"  Frame {fi}: NO_MATCH score={score:.1%}")

# Export results as JSON for the HTML builder
output = {
    'width': w,
    'height': h,
    'gridW': grid_w,
    'gridH': grid_h,
    'tileSize': 48,
    'tiles': [],
    'animated': []
}

for r in results:
    if 'sheet' in r:
        output['tiles'].append({
            'gx': r['gx'], 'gy': r['gy'],
            'sheet': r['sheet'], 'col': r['col'], 'row': r['row'],
            'score': round(r['score'], 4)
        })

# Save
with open('/Users/apocys/.openclaw/workspace/fleetkit-v2/office2_analysis.json', 'w') as f:
    json.dump(output, f, indent=2)

print("\nAnalysis saved to office2_analysis.json")
