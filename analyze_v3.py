#!/usr/bin/env python3
"""Analyze Office Design 2 considering it's 2x scaled from 256x400."""

from PIL import Image
import numpy as np
import zlib, struct

MEDIA = "/Users/apocys/.openclaw/media"
SPRITES = "/Users/apocys/.openclaw/workspace/fleetkit-v2/lib/sprites/modern-office-revamped"

# The Aseprite is 256x400, the GIF is 512x544 (not exactly 2x!)
# Wait - 256*2=512 (matches width), but 400*2=800 ≠ 544
# So the GIF is NOT simply 2x the aseprite
# Actually the extracted frames are 512x544 but the aseprite is 256x400
# Let's check the actual GIF dimensions

from PIL import Image as PILImage
gif = PILImage.open(f"{SPRITES}/6_Office_Designs/Office_Design_2.gif")
print(f"GIF size: {gif.size}")
print(f"GIF n_frames: {gif.n_frames}")

# Check each frame
for i in range(gif.n_frames):
    gif.seek(i)
    print(f"  Frame {i}: size={gif.size}, mode={gif.mode}")

# Re-extract frames properly from GIF
frames_proper = []
for i in range(gif.n_frames):
    gif.seek(i)
    frame = gif.convert("RGBA")
    frames_proper.append(np.array(frame))
    print(f"  Frame {i} as RGBA: {frames_proper[-1].shape}")

# Compare with pre-extracted frames
for i in range(min(6, len(frames_proper))):
    ext = np.array(Image.open(f"{MEDIA}/office-design-2-frame{i}.png").convert("RGBA"))
    diff_count = np.sum(np.any(ext != frames_proper[i], axis=2))
    print(f"  Pre-extracted frame {i} vs GIF: {diff_count} diff pixels (shapes: {ext.shape} vs {frames_proper[i].shape})")

# Now parse the Aseprite more carefully to extract the actual pixel data
ase_path = f"{SPRITES}/6_Office_Designs/Office_Design_2.aseprite"
with open(ase_path, 'rb') as f:
    data = f.read()

# Header
file_size = int.from_bytes(data[0:4], 'little')
magic = int.from_bytes(data[4:6], 'little')
n_frames = int.from_bytes(data[6:8], 'little')
ase_w = int.from_bytes(data[8:10], 'little')
ase_h = int.from_bytes(data[10:12], 'little')
color_depth = int.from_bytes(data[12:14], 'little')  # 32 = RGBA
print(f"\nAseprite: {ase_w}x{ase_h}, {n_frames} frames, depth={color_depth}bpp")

# Parse all frames to get layer names and cel data
pos = 128
layers = []
all_cels = {fi: {} for fi in range(n_frames)}

for fi in range(n_frames):
    frame_size = int.from_bytes(data[pos:pos+4], 'little')
    n_chunks_old = int.from_bytes(data[pos+6:pos+8], 'little')
    duration = int.from_bytes(data[pos+8:pos+10], 'little')
    n_chunks = int.from_bytes(data[pos+12:pos+16], 'little')
    if n_chunks == 0:
        n_chunks = n_chunks_old
    
    chunk_pos = pos + 16
    for ci in range(n_chunks):
        if chunk_pos >= pos + frame_size:
            break
        chunk_size = int.from_bytes(data[chunk_pos:chunk_pos+4], 'little')
        chunk_type = int.from_bytes(data[chunk_pos+4:chunk_pos+6], 'little')
        
        if chunk_type == 0x2004:  # Layer
            flags = int.from_bytes(data[chunk_pos+6:chunk_pos+8], 'little')
            layer_type = int.from_bytes(data[chunk_pos+8:chunk_pos+10], 'little')
            name_len = int.from_bytes(data[chunk_pos+22:chunk_pos+24], 'little')
            name = data[chunk_pos+24:chunk_pos+24+name_len].decode('utf-8', errors='replace')
            layers.append(name)
        
        elif chunk_type == 0x2005:  # Cel
            layer_idx = int.from_bytes(data[chunk_pos+6:chunk_pos+8], 'little')
            x = int.from_bytes(data[chunk_pos+8:chunk_pos+10], 'little', signed=True)
            y = int.from_bytes(data[chunk_pos+10:chunk_pos+12], 'little', signed=True)
            opacity = data[chunk_pos+12]
            cel_type = int.from_bytes(data[chunk_pos+13:chunk_pos+15], 'little')
            
            if cel_type == 2:  # Compressed image
                cel_w = int.from_bytes(data[chunk_pos+15:chunk_pos+17], 'little')
                cel_h = int.from_bytes(data[chunk_pos+17:chunk_pos+19], 'little')
                compressed_data = data[chunk_pos+19:chunk_pos+chunk_size]
                try:
                    raw = zlib.decompress(compressed_data)
                    # For RGBA (32bpp): 4 bytes per pixel
                    expected = cel_w * cel_h * 4
                    if len(raw) == expected:
                        pixels = np.frombuffer(raw, dtype=np.uint8).reshape(cel_h, cel_w, 4)
                        all_cels[fi][layer_idx] = {
                            'x': x, 'y': y, 'w': cel_w, 'h': cel_h,
                            'pixels': pixels
                        }
                except Exception as e:
                    print(f"  Decompress error frame {fi} layer {layer_idx}: {e}")
            
            elif cel_type == 1:  # Linked
                frame_link = int.from_bytes(data[chunk_pos+15:chunk_pos+17], 'little')
                if frame_link in all_cels and layer_idx in all_cels[frame_link]:
                    all_cels[fi][layer_idx] = all_cels[frame_link][layer_idx].copy()
                    # But update x,y from this cel
                    all_cels[fi][layer_idx]['x'] = x if x != 0 else all_cels[frame_link][layer_idx]['x']
                    all_cels[fi][layer_idx]['y'] = y if y != 0 else all_cels[frame_link][layer_idx]['y']
        
        chunk_pos += chunk_size
    pos += frame_size

print(f"\nLayers: {layers}")
for fi in range(n_frames):
    print(f"Frame {fi}: {len(all_cels[fi])} cels")
    for li, cel in sorted(all_cels[fi].items()):
        print(f"  Layer {li} ({layers[li] if li < len(layers) else '?'}): pos=({cel['x']},{cel['y']}), size={cel['w']}x{cel['h']}")

# Composite all layers for frame 0 at native resolution
composite = np.zeros((ase_h, ase_w, 4), dtype=np.uint8)
for li in sorted(all_cels[0].keys()):
    cel = all_cels[0][li]
    px = cel['pixels']
    x, y = cel['x'], cel['y']
    h_c, w_c = px.shape[:2]
    
    # Alpha composite
    for py_c in range(h_c):
        for px_c in range(w_c):
            dy = y + py_c
            dx = x + px_c
            if 0 <= dy < ase_h and 0 <= dx < ase_w:
                src_a = px[py_c, px_c, 3] / 255.0
                if src_a > 0:
                    dst_a = composite[dy, dx, 3] / 255.0
                    out_a = src_a + dst_a * (1 - src_a)
                    if out_a > 0:
                        for ch in range(3):
                            composite[dy, dx, ch] = np.uint8(
                                (px[py_c, px_c, ch] * src_a + composite[dy, dx, ch] * dst_a * (1 - src_a)) / out_a
                            )
                    composite[dy, dx, 3] = np.uint8(out_a * 255)

# Save composite
img_out = Image.fromarray(composite)
img_out.save(f"{MEDIA}/office2_composite_native.png")
print(f"\nSaved native composite: {ase_w}x{ase_h}")

# Now upscale 2x and compare with the GIF
composite_2x = np.array(img_out.resize((ase_w*2, ase_h*2), Image.NEAREST))
print(f"2x composite: {composite_2x.shape[1]}x{composite_2x.shape[0]}")
print(f"GIF frame 0:  {frames_proper[0].shape[1]}x{frames_proper[0].shape[0]}")

# They have different sizes (512x800 vs 512x544)
# So it's NOT a simple 2x upscale with no other changes

# Let me check the non-transparent region of the GIF frame
frame0 = frames_proper[0]
alpha = frame0[:,:,3]
nz = np.argwhere(alpha > 0)
if len(nz) > 0:
    min_y, min_x = nz.min(axis=0)
    max_y, max_x = nz.max(axis=0)
    print(f"\nGIF non-transparent: ({min_x},{min_y})-({max_x},{max_y}), size={max_x-min_x+1}x{max_y-min_y+1}")

# And the composite
alpha2 = composite[:,:,3]
nz2 = np.argwhere(alpha2 > 0)
if len(nz2) > 0:
    min_y2, min_x2 = nz2.min(axis=0)
    max_y2, max_x2 = nz2.max(axis=0)
    print(f"Native non-transparent: ({min_x2},{min_y2})-({max_x2},{max_y2}), size={max_x2-min_x2+1}x{max_y2-min_y2+1}")

# Check if each layer uses tile-sized content
for li, cel in sorted(all_cels[0].items()):
    print(f"\nLayer {li} ({layers[li]}): {cel['w']}x{cel['h']} at ({cel['x']},{cel['y']})")
    # Check if size is multiple of 24 (half of 48)
    print(f"  Size/24: {cel['w']/24:.1f} x {cel['h']/24:.1f}")
    print(f"  Size/48: {cel['w']/48:.1f} x {cel['h']/48:.1f}")
    # Check non-transparent content
    px = cel['pixels']
    a = px[:,:,3]
    nz = np.argwhere(a > 0)
    if len(nz) > 0:
        print(f"  Content bbox: y={nz[:,0].min()}-{nz[:,0].max()}, x={nz[:,1].min()}-{nz[:,1].max()}")
    else:
        print(f"  All transparent")
