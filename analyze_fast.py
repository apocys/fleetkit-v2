#!/usr/bin/env python3
"""Fast tile analysis using hash-based matching and smart offset detection."""

from PIL import Image
import numpy as np
import json, hashlib

MEDIA = "/Users/apocys/.openclaw/media"
SPRITES = "/Users/apocys/.openclaw/workspace/fleetkit-v2/lib/sprites/modern-office-revamped"

# Load all 6 frames
frames = []
for i in range(6):
    img = Image.open(f"{MEDIA}/office-design-2-frame{i}.png").convert("RGBA")
    frames.append(np.array(img))
h, w = frames[0].shape[:2]
print(f"Frame: {w}x{h}")

# Load tilesheets
rb = np.array(Image.open(f"{SPRITES}/1_Room_Builder_Office/Room_Builder_Office_48x48.png").convert("RGBA"))
mo = np.array(Image.open(f"{SPRITES}/Modern_Office_48x48.png").convert("RGBA"))
bs = np.array(Image.open(f"{SPRITES}/2_Modern_Office_Black_Shadow/Modern_Office_Black_Shadow_48x48.png").convert("RGBA"))

# Load individual singles too
import glob
singles = {}
for path in sorted(glob.glob(f"{SPRITES}/4_Modern_Office_Singles/48x48/Modern_Office_Singles_48x48_*.png")):
    num = int(path.split('_')[-1].split('.')[0])
    singles[num] = np.array(Image.open(path).convert("RGBA"))

print(f"Loaded {len(singles)} singles")

# Strategy: The design GIF is composed by layering tiles from tilesheets.
# But GIF has color quantization (256 color palette), so exact match won't work.
# The extracted PNGs might have the GIF's quantized colors, not the tileset's truecolor.

# Let me check this theory:
print("\n=== COLOR COMPARISON ===")
# A wall tile from Room Builder - row 1, col 0 (typical wall)
rb_tile = rb[48:96, 0:48]
print(f"RB tile (0,1) sample pixel: {rb_tile[24,24]}")

# Same area in frame 0 (if we knew which area has a wall...)
# Let me look at the actual colors in the frame
unique_colors = set()
for y in range(h):
    for x in range(w):
        c = tuple(frames[0][y,x])
        unique_colors.add(c)
print(f"Unique colors in frame 0: {len(unique_colors)}")

# Since GIF has max 256 colors, and the tilesets use truecolor...
# We need to match approximately. Let's use a color distance threshold.

# BETTER APPROACH: Instead of matching against tilesets (which have different colors due to GIF quantization),
# let's take a completely different approach:
# 1. DIRECTLY draw the GIF frames using canvas by drawing the actual pixel data
# 2. Use the extracted frames as sprite sheets themselves

# Actually wait - the task says to use the tilesheets with ctx.drawImage. 
# So we need to figure out which tileset tiles compose the design.

# Let me try: render tiles from the tileset onto a temporary canvas, 
# then compare with TOLERANCE to the GIF frame.

# But first, let me understand the GIF better.
# Let's look at the Aseprite file header to get layer info
ase_path = f"{SPRITES}/6_Office_Designs/Office_Design_2.aseprite"
with open(ase_path, 'rb') as f:
    data = f.read()

# Aseprite format: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
# Header is 128 bytes
header = data[:128]
file_size = int.from_bytes(header[0:4], 'little')
magic = int.from_bytes(header[4:6], 'little')
n_frames_ase = int.from_bytes(header[6:8], 'little')
width_ase = int.from_bytes(header[8:10], 'little')
height_ase = int.from_bytes(header[10:12], 'little')
color_depth = int.from_bytes(header[12:14], 'little')
print(f"\nAseprite: {width_ase}x{height_ase}, {n_frames_ase} frames, color_depth={color_depth}")
print(f"Magic: {hex(magic)}")

# Parse frames to find layer info
# Frame header starts at offset 128
pos = 128
for frame_idx in range(min(n_frames_ase, 1)):  # Just parse frame 0
    frame_size = int.from_bytes(data[pos:pos+4], 'little')
    frame_magic = int.from_bytes(data[pos+4:pos+6], 'little')
    n_chunks_old = int.from_bytes(data[pos+6:pos+8], 'little')
    duration = int.from_bytes(data[pos+8:pos+10], 'little')
    n_chunks = int.from_bytes(data[pos+12:pos+16], 'little')
    if n_chunks == 0:
        n_chunks = n_chunks_old
    print(f"Frame {frame_idx}: size={frame_size}, chunks={n_chunks}, duration={duration}ms")
    
    chunk_pos = pos + 16
    for chunk_idx in range(n_chunks):
        if chunk_pos >= pos + frame_size:
            break
        chunk_size = int.from_bytes(data[chunk_pos:chunk_pos+4], 'little')
        chunk_type = int.from_bytes(data[chunk_pos+4:chunk_pos+6], 'little')
        
        if chunk_type == 0x2004:  # Layer chunk
            flags = int.from_bytes(data[chunk_pos+6:chunk_pos+8], 'little')
            layer_type = int.from_bytes(data[chunk_pos+8:chunk_pos+10], 'little')
            child_level = int.from_bytes(data[chunk_pos+10:chunk_pos+12], 'little')
            blend_mode = int.from_bytes(data[chunk_pos+16:chunk_pos+18], 'little')
            opacity = data[chunk_pos+18]
            name_len = int.from_bytes(data[chunk_pos+22:chunk_pos+24], 'little')
            name = data[chunk_pos+24:chunk_pos+24+name_len].decode('utf-8', errors='replace')
            print(f"  Layer: '{name}', type={layer_type}, flags={flags}, blend={blend_mode}, opacity={opacity}")
        
        elif chunk_type == 0x2005:  # Cel chunk
            layer_idx = int.from_bytes(data[chunk_pos+6:chunk_pos+8], 'little')
            x_pos = int.from_bytes(data[chunk_pos+8:chunk_pos+10], 'little', signed=True)
            y_pos = int.from_bytes(data[chunk_pos+10:chunk_pos+12], 'little', signed=True)
            opacity = data[chunk_pos+12]
            cel_type = int.from_bytes(data[chunk_pos+13:chunk_pos+15], 'little')
            print(f"  Cel: layer={layer_idx}, pos=({x_pos},{y_pos}), opacity={opacity}, type={cel_type}")
            if cel_type == 0:  # Raw
                cel_w = int.from_bytes(data[chunk_pos+15:chunk_pos+17], 'little')
                cel_h = int.from_bytes(data[chunk_pos+17:chunk_pos+19], 'little')
                print(f"    Raw: {cel_w}x{cel_h}")
            elif cel_type == 1:  # Linked cel
                frame_link = int.from_bytes(data[chunk_pos+15:chunk_pos+17], 'little')
                print(f"    Linked to frame {frame_link}")
            elif cel_type == 2:  # Compressed
                cel_w = int.from_bytes(data[chunk_pos+15:chunk_pos+17], 'little')
                cel_h = int.from_bytes(data[chunk_pos+17:chunk_pos+19], 'little')
                print(f"    Compressed: {cel_w}x{cel_h}")
            elif cel_type == 3:  # Compressed tilemap
                cel_w = int.from_bytes(data[chunk_pos+15:chunk_pos+17], 'little')
                cel_h = int.from_bytes(data[chunk_pos+17:chunk_pos+19], 'little')
                print(f"    Tilemap: {cel_w}x{cel_h}")
        
        elif chunk_type == 0x2018:  # Tags
            n_tags = int.from_bytes(data[chunk_pos+6:chunk_pos+8], 'little')
            print(f"  Tags: {n_tags}")
        
        elif chunk_type == 0x2023:  # Tileset
            tileset_id = int.from_bytes(data[chunk_pos+6:chunk_pos+10], 'little')
            tile_count = int.from_bytes(data[chunk_pos+10:chunk_pos+14], 'little')
            tile_w = int.from_bytes(data[chunk_pos+14:chunk_pos+16], 'little')
            tile_h = int.from_bytes(data[chunk_pos+16:chunk_pos+18], 'little')
            print(f"  Tileset: id={tileset_id}, count={tile_count}, tile={tile_w}x{tile_h}")
        
        else:
            pass  # print(f"  Chunk type {hex(chunk_type)}, size={chunk_size}")
        
        chunk_pos += chunk_size
    
    pos += frame_size

# Now let me do a FAST approximate match using color tolerance
print("\n=== FAST APPROXIMATE MATCH (tolerance=5) ===")

def approx_match(target, candidate, tolerance=5):
    """Match tiles with color tolerance for GIF quantization."""
    cand_visible = candidate[:,:,3] > 0
    target_visible = target[:,:,3] > 0
    
    if not np.any(cand_visible):
        return 0, 0
    
    # Where candidate has pixels
    both_visible = cand_visible & target_visible
    if not np.any(both_visible):
        return 0, 0
    
    # Color distance
    t_rgb = target[:,:,:3].astype(np.int16)
    c_rgb = candidate[:,:,:3].astype(np.int16)
    diff = np.abs(t_rgb - c_rgb)
    max_diff = np.max(diff, axis=2)  # max channel diff per pixel
    
    close_enough = (max_diff <= tolerance) & both_visible
    match_ratio = np.sum(close_enough) / np.sum(both_visible) if np.sum(both_visible) > 0 else 0
    coverage = np.sum(cand_visible) / (48*48)
    
    return float(match_ratio), float(coverage)

# Test a few specific offsets first
# Common choices: (0,0), (8,0), (16,0), (0,8), (8,8), (16,16), (8,16)
for ox, oy in [(0,0), (8,0), (16,0), (0,8), (8,8), (16,16), (8,16), (0,16), (24,0), (0,24), (32,0), (0,32)]:
    cols = (w - ox) // 48
    rows = (h - oy) // 48
    
    good_matches = 0
    total_cells = 0
    
    for gy in range(min(rows, 3)):  # Just check first 3 rows
        for gx in range(cols):
            px = ox + gx * 48
            py = oy + gy * 48
            target = frames[0][py:py+48, px:px+48]
            if target.shape != (48, 48, 4):
                continue
            if np.all(target[:,:,3] == 0):
                good_matches += 1
                total_cells += 1
                continue
            
            total_cells += 1
            
            # Check against RB tiles (quick scan)
            for r in range(rb.shape[0] // 48):
                for c in range(rb.shape[1] // 48):
                    tile = rb[r*48:(r+1)*48, c*48:(c+1)*48]
                    match_r, cov = approx_match(target, tile, tolerance=10)
                    if match_r > 0.9 and cov > 0.5:
                        good_matches += 1
                        break
                else:
                    continue
                break
    
    pct = good_matches / total_cells * 100 if total_cells > 0 else 0
    print(f"Offset ({ox:2d},{oy:2d}): {good_matches}/{total_cells} cells matched ({pct:.0f}%)")
