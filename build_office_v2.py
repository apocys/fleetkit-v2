#!/usr/bin/env python3
"""Build the final Office Design 2 HTML using 16x16 tiles scaled to 48x48."""

from PIL import Image
import numpy as np
import json

MEDIA = "/Users/apocys/.openclaw/media"
SPRITES = "/Users/apocys/.openclaw/workspace/fleetkit-v2/lib/sprites/modern-office-revamped"

# The GIF is 512x544 = 2x upscale from 256x272
# Original grid: 256/16 = 16 cols, 272/16 = 17 rows at 16x16 tiles
# Output grid: same layout but at 48x48 tiles = 16*48 = 768 wide, 17*48 = 816 tall

ORIGINAL_TILE = 16
OUTPUT_TILE = 48
SCALE = OUTPUT_TILE // ORIGINAL_TILE  # 3x

GRID_W = 16  # columns
GRID_H = 17  # rows

# Load 16x16 tilesets
rb16 = np.array(Image.open(f"{SPRITES}/1_Room_Builder_Office/Room_Builder_Office_16x16.png").convert("RGBA"))
mo16 = np.array(Image.open(f"{SPRITES}/Modern_Office_16x16.png").convert("RGBA"))

print(f"RB 16x16: {rb16.shape[1]}x{rb16.shape[0]} ({rb16.shape[1]//16}x{rb16.shape[0]//16} tiles)")
print(f"MO 16x16: {mo16.shape[1]}x{mo16.shape[0]} ({mo16.shape[1]//16}x{mo16.shape[0]//16} tiles)")

# Load all 6 frames and downscale to original resolution to analyze
frames_orig = []
for i in range(6):
    img = Image.open(f"{MEDIA}/office-design-2-frame{i}.png").convert("RGBA")
    # Downscale by factor of 2 using NEAREST to get original 256x272
    orig = img.resize((256, 272), Image.NEAREST)
    frames_orig.append(np.array(orig))

print(f"Original frames: {frames_orig[0].shape}")

# Build tile database from 16x16 tilesets
tile_db = []
for name, sheet in [('RB', rb16), ('MO', mo16)]:
    sh, sw = sheet.shape[:2]
    cols = sw // ORIGINAL_TILE
    rows = sh // ORIGINAL_TILE
    for r in range(rows):
        for c in range(cols):
            tile = sheet[r*ORIGINAL_TILE:(r+1)*ORIGINAL_TILE, c*ORIGINAL_TILE:(c+1)*ORIGINAL_TILE]
            if np.any(tile[:,:,3] > 0):  # Non-empty
                tile_db.append((name, c, r, tile))

print(f"16x16 tile database: {len(tile_db)} non-empty tiles")

def find_exact_match(target, db):
    """Find exact pixel match in database."""
    for name, c, r, tile_data in db:
        if np.array_equal(target, tile_data):
            return (name, c, r)
    return None

def find_best_match(target, db, tolerance=3):
    """Find best approximate match."""
    if np.all(target[:,:,3] == 0):
        return ('EMPTY', 0, 0)
    
    best_score = 999
    best_match = None
    
    for name, c, r, tile_data in db:
        # Simple pixel difference
        diff = np.abs(target.astype(np.int16) - tile_data.astype(np.int16))
        score = np.mean(diff)
        if score < best_score:
            best_score = score
            best_match = (name, c, r)
    
    if best_score < tolerance:
        return best_match
    return None

# Analyze frame 0 to build the base grid
print("\n=== ANALYZING FRAME 0 GRID ===")
base_grid = {}

for gy in range(GRID_H):
    for gx in range(GRID_W):
        px = gx * ORIGINAL_TILE
        py = gy * ORIGINAL_TILE
        target = frames_orig[0][py:py+ORIGINAL_TILE, px:px+ORIGINAL_TILE]
        
        # Try exact match first
        exact = find_exact_match(target, tile_db)
        if exact:
            base_grid[(gx, gy)] = exact
        else:
            # Try approximate
            approx = find_best_match(target, tile_db, tolerance=5)
            if approx:
                base_grid[(gx, gy)] = approx
            else:
                # Fallback: use raw pixel data
                base_grid[(gx, gy)] = ('RAW', target)

# Find animated tiles
print("\n=== FINDING ANIMATED TILES ===")
animated_tiles = {}

for gy in range(GRID_H):
    for gx in range(GRID_W):
        px = gx * ORIGINAL_TILE
        py = gy * ORIGINAL_TILE
        
        # Check if this tile changes across frames
        tiles = [f[py:py+ORIGINAL_TILE, px:px+ORIGINAL_TILE] for f in frames_orig]
        
        # Find unique frames
        unique_frames = []
        frame_indices = []  # which frames use each unique tile
        
        for fi in range(6):
            found_existing = False
            for ui, unique_tile in enumerate(unique_frames):
                if np.array_equal(tiles[fi], unique_tile):
                    frame_indices[ui].append(fi)
                    found_existing = True
                    break
            if not found_existing:
                unique_frames.append(tiles[fi])
                frame_indices.append([fi])
        
        if len(unique_frames) > 1:
            print(f"  Animated tile at ({gx},{gy}): {len(unique_frames)} unique frames")
            
            # Match each unique frame to tileset
            frame_matches = []
            for unique_tile in unique_frames:
                exact = find_exact_match(unique_tile, tile_db)
                if exact:
                    frame_matches.append(exact)
                else:
                    approx = find_best_match(unique_tile, tile_db, tolerance=5)
                    if approx:
                        frame_matches.append(approx)
                    else:
                        frame_matches.append(('RAW', unique_tile))
            
            animated_tiles[(gx, gy)] = {
                'frames': frame_matches,
                'frame_indices': frame_indices
            }

print(f"Found {len(animated_tiles)} animated tile positions")

# Print the grid
print("\n=== BASE GRID ===")
for gy in range(GRID_H):
    line = f"Row {gy:2d}: "
    for gx in range(GRID_W):
        tile = base_grid.get((gx, gy), ('???', 0, 0))
        if tile[0] == 'EMPTY':
            line += " ---- "
        elif tile[0] == 'RAW':
            line += " ?RAW?"
        else:
            line += f"{tile[0]}({tile[1]:2d},{tile[2]:2d})"
        line += " "
    print(line)

# Generate the HTML
print("\n=== GENERATING HTML ===")

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
            background: #000;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
            border: 2px solid #555;
        }}
        .info {{
            margin-top: 10px;
            font-size: 12px;
        }}
    </style>
</head>
<body>
    <h1>Office Design 2</h1>
    <canvas id="canvas" width="{GRID_W * OUTPUT_TILE}" height="{GRID_H * OUTPUT_TILE}"></canvas>
    <div class="info">
        <div>Size: {GRID_W * OUTPUT_TILE}×{GRID_H * OUTPUT_TILE} pixels ({GRID_W}×{GRID_H} tiles at {OUTPUT_TILE}px each)</div>
        <div>Animation: 6 frames at 100ms each</div>
        <div>Animated positions: {len(animated_tiles)}</div>
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
        let animFrame = 0;
        let lastFrameTime = 0;
        const FRAME_DURATION = 100; // ms
        
        // Base grid data (static tiles)
        const baseGrid = {json.dumps({str(k): v for k, v in base_grid.items() if (k not in animated_tiles)})};
        
        // Animated tiles data
        const animatedTiles = {json.dumps({str(k): v for k, v in animated_tiles.items()})};
        
        // Load images
        const loadImages = async () => {{
            const loadImage = (src) => new Promise((resolve, reject) => {{
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            }});
            
            try {{
                roomBuilderImg = await loadImage('../lib/sprites/modern-office-revamped/1_Room_Builder_Office/Room_Builder_Office_48x48.png');
                modernOfficeImg = await loadImage('../lib/sprites/modern-office-revamped/Modern_Office_48x48.png');
                console.log('Images loaded successfully');
                animate();
            }} catch (error) {{
                console.error('Failed to load images:', error);
            }}
        }};
        
        const drawTile = (sheet, col, row, destX, destY) => {{
            const img = sheet === 'RB' ? roomBuilderImg : modernOfficeImg;
            if (!img) return;
            
            // Source coordinates in the tileset (48x48 tiles)
            const sx = col * 48;
            const sy = row * 48;
            
            // Draw at destination
            ctx.drawImage(img, sx, sy, 48, 48, destX, destY, TILE_SIZE, TILE_SIZE);
        }};
        
        const render = () => {{
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw base tiles
            for (const [posKey, tile] of Object.entries(baseGrid)) {{
                const [gx, gy] = posKey.split(',').map(Number);
                const destX = gx * TILE_SIZE;
                const destY = gy * TILE_SIZE;
                
                if (tile[0] === 'EMPTY') {{
                    // Skip empty tiles
                    continue;
                }} else if (tile[0] === 'RAW') {{
                    // For RAW tiles, fill with a placeholder color
                    ctx.fillStyle = '#ff00ff';
                    ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
                }} else {{
                    drawTile(tile[0], tile[1], tile[2], destX, destY);
                }}
            }}
            
            // Draw animated tiles
            for (const [posKey, animData] of Object.entries(animatedTiles)) {{
                const [gx, gy] = posKey.split(',').map(Number);
                const destX = gx * TILE_SIZE;
                const destY = gy * TILE_SIZE;
                
                // Find which frame to show based on current animation frame
                let tileToShow = animData.frames[0]; // default
                
                for (let i = 0; i < animData.frame_indices.length; i++) {{
                    if (animData.frame_indices[i].includes(animFrame)) {{
                        tileToShow = animData.frames[i];
                        break;
                    }}
                }}
                
                if (tileToShow[0] === 'RAW') {{
                    ctx.fillStyle = '#00ffff';
                    ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
                }} else if (tileToShow[0] !== 'EMPTY') {{
                    drawTile(tileToShow[0], tileToShow[1], tileToShow[2], destX, destY);
                }}
            }}
        }};
        
        const animate = (currentTime = 0) => {{
            if (currentTime - lastFrameTime >= FRAME_DURATION) {{
                animFrame = (animFrame + 1) % 6;
                lastFrameTime = currentTime;
                render();
            }}
            requestAnimationFrame(animate);
        }};
        
        // Start loading
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

print("✅ HTML file generated: /Users/apocys/.openclaw/workspace/fleetkit-v2/office-modern-v2/index.html")
print(f"Canvas size: {GRID_W * OUTPUT_TILE}×{GRID_H * OUTPUT_TILE} pixels")
print(f"Grid: {GRID_W}×{GRID_H} tiles at {OUTPUT_TILE}px each")