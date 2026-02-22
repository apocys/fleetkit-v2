#!/usr/bin/env python3
"""Final build with improved tile matching and proper JSON serialization."""

from PIL import Image
import numpy as np
import json

MEDIA = "/Users/apocys/.openclaw/media"
SPRITES = "/Users/apocys/.openclaw/workspace/fleetkit-v2/lib/sprites/modern-office-revamped"

ORIGINAL_TILE = 16
OUTPUT_TILE = 48
SCALE = OUTPUT_TILE // ORIGINAL_TILE  # 3x

GRID_W = 16  # columns
GRID_H = 17  # rows

# Load 16x16 tilesets
rb16 = np.array(Image.open(f"{SPRITES}/1_Room_Builder_Office/Room_Builder_Office_16x16.png").convert("RGBA"))
mo16 = np.array(Image.open(f"{SPRITES}/Modern_Office_16x16.png").convert("RGBA"))

# But we need to map to 48x48 coordinates since the task requires using 48x48 tilesheets
# So let's use the 48x48 tilesheets but with proper scaling logic
rb48 = np.array(Image.open(f"{SPRITES}/1_Room_Builder_Office/Room_Builder_Office_48x48.png").convert("RGBA"))
mo48 = np.array(Image.open(f"{SPRITES}/Modern_Office_48x48.png").convert("RGBA"))

print(f"RB 48x48: {rb48.shape[1]}x{rb48.shape[0]} ({rb48.shape[1]//48}x{rb48.shape[0]//48} tiles)")
print(f"MO 48x48: {mo48.shape[1]}x{mo48.shape[0]} ({mo48.shape[1]//48}x{mo48.shape[0]//48} tiles)")

# Load all 6 frames and downscale to original resolution
frames_orig = []
for i in range(6):
    img = Image.open(f"{MEDIA}/office-design-2-frame{i}.png").convert("RGBA")
    # Downscale by factor of 2 using NEAREST to get original 256x272
    orig = img.resize((256, 272), Image.NEAREST)
    frames_orig.append(np.array(orig))

# Build 48x48 tile database  
tile_db = []
for name, sheet in [('RB', rb48), ('MO', mo48)]:
    sh, sw = sheet.shape[:2]
    cols = sw // 48
    rows = sh // 48
    for r in range(rows):
        for c in range(cols):
            tile = sheet[r*48:(r+1)*48, c*48:(c+1)*48]
            if np.any(tile[:,:,3] > 0):  # Non-empty
                # Scale down to 16x16 for matching
                tile_16 = np.array(Image.fromarray(tile).resize((16, 16), Image.NEAREST))
                tile_db.append((name, c, r, tile_16))

print(f"48x48 tile database: {len(tile_db)} non-empty tiles")

def find_best_match(target, db, tolerance=20):
    """Find best approximate match with higher tolerance for GIF quantization."""
    if np.all(target[:,:,3] == 0):
        return ('EMPTY', 0, 0)
    
    best_score = 9999
    best_match = None
    
    target_vis = target[:,:,3] > 0
    
    for name, c, r, tile_data in db:
        tile_vis = tile_data[:,:,3] > 0
        
        # Alpha mismatch penalty
        alpha_mismatch = np.sum(target_vis != tile_vis)
        
        # RGB distance where both visible
        both_vis = target_vis & tile_vis
        if np.any(both_vis):
            rgb_diff = np.abs(target[:,:,:3].astype(np.float32) - tile_data[:,:,:3].astype(np.float32))
            rgb_score = np.mean(rgb_diff[both_vis])
        else:
            if not np.any(target_vis) and not np.any(tile_vis):
                rgb_score = 0  # Both empty
            else:
                rgb_score = 255  # One empty, one not
        
        total_score = rgb_score + alpha_mismatch * 2
        
        if total_score < best_score:
            best_score = total_score
            best_match = (name, c, r)
    
    if best_score < tolerance:
        return best_match
    return ('UNKNOWN', 0, 0)

# Analyze frame 0 to build the base grid
print("\n=== ANALYZING FRAME 0 GRID ===")
base_grid = {}

for gy in range(GRID_H):
    for gx in range(GRID_W):
        px = gx * ORIGINAL_TILE
        py = gy * ORIGINAL_TILE
        target = frames_orig[0][py:py+ORIGINAL_TILE, px:px+ORIGINAL_TILE]
        
        match = find_best_match(target, tile_db, tolerance=30)
        base_grid[(gx, gy)] = match

# Find animated tiles
print("\n=== FINDING ANIMATED TILES ===")
animated_tiles = {}

for gy in range(GRID_H):
    for gx in range(GRID_W):
        px = gx * ORIGINAL_TILE
        py = gy * ORIGINAL_TILE
        
        # Check if this tile changes across frames
        tiles = [f[py:py+ORIGINAL_TILE, px:px+ORIGINAL_TILE] for f in frames_orig]
        
        # Find unique frames (using string representation for comparison)
        unique_tiles = []
        frame_map = {}  # frame_index -> unique_tile_index
        
        for fi in range(6):
            tile_key = tiles[fi].tobytes()
            
            # Find if this tile already exists
            unique_idx = None
            for ui, (existing_key, _) in enumerate(unique_tiles):
                if existing_key == tile_key:
                    unique_idx = ui
                    break
            
            if unique_idx is None:
                unique_idx = len(unique_tiles)
                unique_tiles.append((tile_key, tiles[fi]))
            
            frame_map[fi] = unique_idx
        
        if len(unique_tiles) > 1:
            print(f"  Animated tile at ({gx},{gy}): {len(unique_tiles)} unique frames")
            
            # Match each unique frame to tileset
            frame_matches = []
            for _, unique_tile in unique_tiles:
                match = find_best_match(unique_tile, tile_db, tolerance=30)
                frame_matches.append(match)
            
            animated_tiles[(gx, gy)] = {
                'frame_matches': frame_matches,
                'frame_map': frame_map  # frame_index -> match_index
            }

print(f"Found {len(animated_tiles)} animated tile positions")

# Convert to JSON-serializable format
def serialize_grid():
    base_serializable = {}
    animated_serializable = {}
    
    for pos, tile in base_grid.items():
        if pos not in animated_tiles:  # Only include non-animated tiles in base
            key = f"{pos[0]},{pos[1]}"
            base_serializable[key] = list(tile)
    
    for pos, anim_data in animated_tiles.items():
        key = f"{pos[0]},{pos[1]}"
        animated_serializable[key] = {
            'frame_matches': [list(match) for match in anim_data['frame_matches']],
            'frame_map': anim_data['frame_map']
        }
    
    return base_serializable, animated_serializable

base_json, animated_json = serialize_grid()

# Count matches for quality report
good_count = 0
unknown_count = 0
empty_count = 0

for tile in base_grid.values():
    if tile[0] == 'UNKNOWN':
        unknown_count += 1
    elif tile[0] == 'EMPTY':
        empty_count += 1
    else:
        good_count += 1

print(f"\nQuality: {good_count} matched, {unknown_count} unknown, {empty_count} empty")

# Generate the HTML
html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Office Design 2 - Modern Office Revamped</title>
    <style>
        body {{
            margin: 0;
            padding: 20px;
            background: #2a2a2a;
            font-family: monospace;
            color: white;
        }}
        canvas {{
            background: transparent;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
            border: 2px solid #555;
            display: block;
        }}
        .info {{
            margin-top: 10px;
            font-size: 12px;
        }}
        .controls {{
            margin-top: 10px;
        }}
        button {{
            background: #444;
            color: white;
            border: 1px solid #666;
            padding: 5px 10px;
            margin-right: 5px;
            cursor: pointer;
        }}
        button:hover {{
            background: #555;
        }}
    </style>
</head>
<body>
    <h1>Office Design 2</h1>
    <canvas id="canvas" width="{GRID_W * OUTPUT_TILE}" height="{GRID_H * OUTPUT_TILE}"></canvas>
    <div class="controls">
        <button onclick="toggleAnimation()">Toggle Animation</button>
        <button onclick="showFrame(0)">Frame 0</button>
        <button onclick="showFrame(1)">Frame 1</button>
        <button onclick="showFrame(2)">Frame 2</button>
        <button onclick="showFrame(3)">Frame 3</button>
        <button onclick="showFrame(4)">Frame 4</button>
        <button onclick="showFrame(5)">Frame 5</button>
    </div>
    <div class="info">
        <div>Size: {GRID_W * OUTPUT_TILE}×{GRID_H * OUTPUT_TILE} pixels ({GRID_W}×{GRID_H} tiles at {OUTPUT_TILE}px each)</div>
        <div>Animation: 6 frames at 100ms each</div>
        <div>Animated positions: {len(animated_tiles)} | Matched tiles: {good_count} | Unknown: {unknown_count}</div>
    </div>

    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        
        const TILE_SIZE = {OUTPUT_TILE};
        const GRID_W = {GRID_W};
        const GRID_H = {GRID_H};
        
        let roomBuilderImg = null;
        let modernOfficeImg = null;
        let currentFrame = 0;
        let isAnimating = true;
        let lastFrameTime = 0;
        const FRAME_DURATION = 100; // ms
        
        // Grid data
        const baseGrid = {json.dumps(base_json)};
        const animatedTiles = {json.dumps(animated_json)};
        
        // Load images
        const loadImages = async () => {{
            const loadImage = (src) => new Promise((resolve, reject) => {{
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = (e) => {{
                    console.error(`Failed to load ${{src}}:`, e);
                    reject(e);
                }};
                img.src = src;
            }});
            
            try {{
                roomBuilderImg = await loadImage('../lib/sprites/modern-office-revamped/1_Room_Builder_Office/Room_Builder_Office_48x48.png');
                modernOfficeImg = await loadImage('../lib/sprites/modern-office-revamped/Modern_Office_48x48.png');
                console.log('Images loaded successfully');
                render();
                animate();
            }} catch (error) {{
                console.error('Failed to load images:', error);
                // Fallback: render placeholders
                render();
            }}
        }};
        
        const drawTile = (sheet, col, row, destX, destY) => {{
            let img;
            if (sheet === 'RB') img = roomBuilderImg;
            else if (sheet === 'MO') img = modernOfficeImg;
            else return;
            
            if (!img) {{
                // Fallback: draw colored rectangle
                ctx.fillStyle = sheet === 'RB' ? '#654321' : '#987654';
                ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
                return;
            }}
            
            // Source coordinates in the 48x48 tileset
            const sx = col * 48;
            const sy = row * 48;
            
            // Draw tile
            ctx.drawImage(img, sx, sy, 48, 48, destX, destY, TILE_SIZE, TILE_SIZE);
        }};
        
        const render = () => {{
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw base tiles (non-animated)
            for (const [posKey, tile] of Object.entries(baseGrid)) {{
                const [gx, gy] = posKey.split(',').map(Number);
                const destX = gx * TILE_SIZE;
                const destY = gy * TILE_SIZE;
                
                if (tile[0] === 'EMPTY') {{
                    // Skip empty tiles
                    continue;
                }} else if (tile[0] === 'UNKNOWN') {{
                    // Unknown tile - draw placeholder
                    ctx.fillStyle = '#ff0080';
                    ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#fff';
                    ctx.font = '12px monospace';
                    ctx.fillText('?', destX + TILE_SIZE/2 - 4, destY + TILE_SIZE/2 + 4);
                }} else {{
                    drawTile(tile[0], tile[1], tile[2], destX, destY);
                }}
            }}
            
            // Draw animated tiles
            for (const [posKey, animData] of Object.entries(animatedTiles)) {{
                const [gx, gy] = posKey.split(',').map(Number);
                const destX = gx * TILE_SIZE;
                const destY = gy * TILE_SIZE;
                
                // Find which tile variant to show for current frame
                const variantIndex = animData.frame_map[currentFrame.toString()];
                const tile = animData.frame_matches[variantIndex];
                
                if (tile[0] === 'EMPTY') {{
                    // Skip
                }} else if (tile[0] === 'UNKNOWN') {{
                    ctx.fillStyle = '#00ff80';
                    ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#fff';
                    ctx.font = '12px monospace';
                    ctx.fillText('A?', destX + TILE_SIZE/2 - 8, destY + TILE_SIZE/2 + 4);
                }} else {{
                    drawTile(tile[0], tile[1], tile[2], destX, destY);
                }}
            }}
        }};
        
        const animate = (currentTime = 0) => {{
            if (isAnimating && currentTime - lastFrameTime >= FRAME_DURATION) {{
                currentFrame = (currentFrame + 1) % 6;
                lastFrameTime = currentTime;
                render();
            }}
            requestAnimationFrame(animate);
        }};
        
        const toggleAnimation = () => {{
            isAnimating = !isAnimating;
        }};
        
        const showFrame = (frame) => {{
            currentFrame = frame;
            isAnimating = false;
            render();
        }};
        
        // Export functions for buttons
        window.toggleAnimation = toggleAnimation;
        window.showFrame = showFrame;
        
        // Start
        loadImages();
    </script>
</body>
</html>'''

# Create output directory
import os
os.makedirs('/Users/apocys/.openclaw/workspace/fleetkit-v2/office-modern-v2', exist_ok=True)

# Write the HTML file
with open('/Users/apocys/.openclaw/workspace/fleetkit-v2/office-modern-v2/index.html', 'w') as f:
    f.write(html_content)

print("\n✅ HTML file generated successfully!")
print(f"📁 Output: /Users/apocys/.openclaw/workspace/fleetkit-v2/office-modern-v2/index.html")
print(f"📐 Canvas size: {GRID_W * OUTPUT_TILE}×{GRID_H * OUTPUT_TILE} pixels")
print(f"🎯 Grid: {GRID_W}×{GRID_H} tiles at {OUTPUT_TILE}px each")
print(f"🎬 Animation: {len(animated_tiles)} animated tiles")
print(f"📊 Quality: {good_count}/{GRID_W*GRID_H} tiles matched from tilesheets")