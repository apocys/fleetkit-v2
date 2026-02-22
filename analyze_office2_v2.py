#!/usr/bin/env python3
"""Analyze Office Design 2 - try multiple grid offsets and layered tile matching."""

from PIL import Image
import numpy as np
import json

MEDIA = "/Users/apocys/.openclaw/media"
SPRITES = "/Users/apocys/.openclaw/workspace/fleetkit-v2/lib/sprites/modern-office-revamped"

# Load frame 0
frame0 = np.array(Image.open(f"{MEDIA}/office-design-2-frame0.png").convert("RGBA"))
h, w = frame0.shape[:2]
print(f"Frame size: {w}x{h}")

# Load tilesheets
room_builder = np.array(Image.open(f"{SPRITES}/1_Room_Builder_Office/Room_Builder_Office_48x48.png").convert("RGBA"))
modern_office = np.array(Image.open(f"{SPRITES}/Modern_Office_48x48.png").convert("RGBA"))

print(f"Room Builder: {room_builder.shape[1]}x{room_builder.shape[0]}")
print(f"Modern Office: {modern_office.shape[1]}x{modern_office.shape[0]}")

# The problem is that the GIF design uses LAYERED tiles - floor + furniture on top
# A single 48x48 region in the GIF is a composition of multiple tiles
# So we need to match against individual tiles considering transparency

def tile_match_score(target, candidate):
    """Score how well candidate overlays onto target, considering alpha."""
    if target.shape != candidate.shape:
        return 0
    # Where candidate has content (alpha > 0)
    cand_visible = candidate[:,:,3] > 0
    if not np.any(cand_visible):
        return 0
    # Compare RGB only where candidate is visible
    rgb_match = np.all(target[:,:,:3][cand_visible] == candidate[:,:,:3][cand_visible], axis=1)
    match_ratio = np.sum(rgb_match) / np.sum(cand_visible)
    coverage = np.sum(cand_visible) / (48*48)
    return float(match_ratio), float(coverage)

# Try different grid offsets
print("\n=== TESTING GRID OFFSETS ===")

# Build tile database 
tile_db = []
rb_h, rb_w = room_builder.shape[:2]
for r in range(rb_h // 48):
    for c in range(rb_w // 48):
        tile = room_builder[r*48:(r+1)*48, c*48:(c+1)*48]
        if np.any(tile[:,:,3] > 0):
            tile_db.append(('RB', c, r, tile))

mo_h, mo_w = modern_office.shape[:2]
for r in range(mo_h // 48):
    for c in range(mo_w // 48):
        tile = modern_office[r*48:(r+1)*48, c*48:(c+1)*48]
        if np.any(tile[:,:,3] > 0):
            tile_db.append(('MO', c, r, tile))

print(f"Non-empty tiles in DB: {len(tile_db)}")

# For each offset, score how many grid cells have a good match
best_offset = None
best_total = 0

for ox in range(0, 48, 8):
    for oy in range(0, 48, 8):
        total_score = 0
        count = 0
        cols = (w - ox) // 48
        rows = (h - oy) // 48
        
        for gy in range(rows):
            for gx in range(cols):
                px = ox + gx * 48
                py = oy + gy * 48
                target = frame0[py:py+48, px:px+48]
                if target.shape != (48, 48, 4):
                    continue
                if np.all(target[:,:,3] == 0):
                    total_score += 1
                    count += 1
                    continue
                
                # Find best match
                best_score = 0
                for sheet, c, r, tile_data in tile_db:
                    score_tuple = tile_match_score(target, tile_data)
                    match_ratio = score_tuple[0]
                    coverage = score_tuple[1]
                    # We want high match ratio AND high coverage
                    combined = match_ratio * coverage
                    if combined > best_score:
                        best_score = combined
                
                total_score += best_score
                count += 1
        
        avg = total_score / count if count > 0 else 0
        if avg > best_total:
            best_total = avg
            best_offset = (ox, oy)
            print(f"  Offset ({ox:2d},{oy:2d}): {cols}x{rows} tiles, avg_score={avg:.4f}, total={total_score:.1f}/{count}")

print(f"\nBest offset: {best_offset} with avg score {best_total:.4f}")

# Actually, let me also check if the tiles might just use an indexed palette vs RGBA
# The GIF format uses indexed colors, so color conversion might be the issue
# Let's check: load the original GIF directly
from PIL import Image as PILImage
gif = PILImage.open(f"{SPRITES}/6_Office_Designs/Office_Design_2.gif")
print(f"\nGIF mode: {gif.mode}")
print(f"GIF size: {gif.size}")
print(f"GIF n_frames: {gif.n_frames}")

# Convert to RGBA properly
gif.seek(0)
gif_rgba = gif.convert("RGBA")
frame0_gif = np.array(gif_rgba)

# Check if extracted frame matches GIF frame 0
frame0_ext = np.array(Image.open(f"{MEDIA}/office-design-2-frame0.png").convert("RGBA"))
diff = np.sum(np.any(frame0_ext != frame0_gif, axis=2))
print(f"Extracted frame vs GIF frame 0: {diff} different pixels")

# Let's check what colors the GIF uses vs the tileset
# Sample a few pixels from known positions
print("\nSample pixels from frame 0:")
for y in range(0, min(h, 240), 48):
    for x in range(0, min(w, 480), 48):
        pixel = frame0[y, x]
        print(f"  ({x:3d},{y:3d}): RGBA={pixel}")

# Sample pixels from Room Builder tileset 
print("\nSample pixels from Room Builder:")
for y in range(0, min(rb_h, 144), 48):
    for x in range(0, min(rb_w, 384), 48):
        pixel = room_builder[y, x]
        if pixel[3] > 0:
            print(f"  ({x:3d},{y:3d}): RGBA={pixel}")

# The issue might be GIF color quantization vs PNG truecolor
# Let's check by looking at color palette of the GIF
gif.seek(0)
palette = gif.getpalette()
if palette:
    print(f"\nGIF palette: {len(palette)//3} colors")
    # Show first 10 colors
    for i in range(min(10, len(palette)//3)):
        print(f"  Color {i}: RGB=({palette[i*3]},{palette[i*3+1]},{palette[i*3+2]})")
