#!/usr/bin/env python3
"""Improved version with better tile matching and layered tile support."""

from PIL import Image
import numpy as np
import json

MEDIA = "/Users/apocys/.openclaw/media"
SPRITES = "/Users/apocys/.openclaw/workspace/fleetkit-v2/lib/sprites/modern-office-revamped"

ORIGINAL_TILE = 16
OUTPUT_TILE = 48
GRID_W = 16
GRID_H = 17

# Load extracted frames and convert to 16x16 grid for analysis
frames_16 = []
for i in range(6):
    img = Image.open(f"{MEDIA}/office-design-2-frame{i}.png").convert("RGBA")
    # Downscale by 2 to get original resolution
    orig = img.resize((256, 272), Image.NEAREST)
    frames_16.append(np.array(orig))

# Load 48x48 tilesets 
rb48 = np.array(Image.open(f"{SPRITES}/1_Room_Builder_Office/Room_Builder_Office_48x48.png").convert("RGBA"))
mo48 = np.array(Image.open(f"{SPRITES}/Modern_Office_48x48.png").convert("RGBA"))

# Build comprehensive tile database at 16x16 resolution for matching
# but keep 48x48 coordinates for final output
floor_tiles = []  # RB tiles that are mostly opaque (floors, walls)
furniture_tiles = []  # MO tiles (furniture, objects)

# Process Room Builder (floors/walls)
rb_h, rb_w = rb48.shape[:2]
rb_cols, rb_rows = rb_w // 48, rb_h // 48
for r in range(rb_rows):
    for c in range(rb_cols):
        tile_48 = rb48[r*48:(r+1)*48, c*48:(c+1)*48]
        if np.any(tile_48[:,:,3] > 0):
            # Convert to 16x16 for matching
            tile_16 = np.array(Image.fromarray(tile_48).resize((16, 16), Image.NEAREST))
            floor_tiles.append(('RB', c, r, tile_16))

# Process Modern Office (furniture)
mo_h, mo_w = mo48.shape[:2]
mo_cols, mo_rows = mo_w // 48, mo_h // 48
for r in range(mo_rows):
    for c in range(mo_cols):
        tile_48 = mo48[r*48:(r+1)*48, c*48:(c+1)*48]
        if np.any(tile_48[:,:,3] > 0):
            tile_16 = np.array(Image.fromarray(tile_48).resize((16, 16), Image.NEAREST))
            furniture_tiles.append(('MO', c, r, tile_16))

all_tiles = floor_tiles + furniture_tiles
print(f"Tile database: {len(floor_tiles)} floor, {len(furniture_tiles)} furniture = {len(all_tiles)} total")

def color_distance(c1, c2):
    """Euclidean distance in RGB space."""
    return np.sqrt(np.sum((c1.astype(np.float32) - c2.astype(np.float32))**2))

def advanced_tile_match(target, candidate, tolerance=25):
    """Advanced tile matching with better color quantization handling."""
    # Alpha comparison
    t_alpha = target[:,:,3] > 0
    c_alpha = candidate[:,:,3] > 0
    
    # Perfect alpha mismatch = not a match
    if np.array_equal(t_alpha, c_alpha):
        alpha_score = 1.0
    else:
        alpha_score = np.sum(t_alpha == c_alpha) / (16*16)
    
    if alpha_score < 0.7:
        return 999  # Not a good match
    
    # RGB comparison where both have content
    both_visible = t_alpha & c_alpha
    if not np.any(both_visible):
        return 0 if alpha_score > 0.95 else 999
    
    # Calculate per-pixel color distance
    distances = []
    for y in range(16):
        for x in range(16):
            if both_visible[y, x]:
                dist = color_distance(target[y, x, :3], candidate[y, x, :3])
                distances.append(dist)
    
    if not distances:
        return 0 if alpha_score > 0.95 else 999
    
    avg_dist = np.mean(distances)
    max_dist = np.max(distances)
    
    # Combine scores
    final_score = avg_dist + (max_dist - avg_dist) * 0.3 + (1 - alpha_score) * 50
    
    return final_score

def find_layered_match(target, floor_db, furniture_db):
    """Try to match target as floor + furniture layers."""
    best_single_score = 999
    best_single = None
    
    # Try single tiles first
    for tile_data in all_tiles:
        score = advanced_tile_match(target, tile_data[3])
        if score < best_single_score:
            best_single_score = score
            best_single = tile_data
    
    # Try floor + furniture combination
    best_combo_score = best_single_score
    best_combo = None
    
    if best_single_score > 15:  # Only try combinations if single match isn't great
        # Try a few promising floor tiles
        floor_candidates = sorted(floor_db, key=lambda x: advanced_tile_match(target, x[3]))[:10]
        furniture_candidates = sorted(furniture_db, key=lambda x: advanced_tile_match(target, x[3]))[:10]
        
        for floor_tile in floor_candidates:
            floor_16 = floor_tile[3]
            
            # Skip if floor doesn't match at all
            if advanced_tile_match(target, floor_16) > 40:
                continue
            
            for furn_tile in furniture_candidates:
                furn_16 = furn_tile[3]
                
                # Simple alpha composite (floor + furniture)
                composite = floor_16.copy().astype(np.float32)
                furn_alpha = furn_16[:,:,3:4] / 255.0
                floor_alpha = composite[:,:,3:4] / 255.0
                
                out_alpha = furn_alpha + floor_alpha * (1 - furn_alpha)
                composite[:,:,:3] = np.where(
                    out_alpha > 0,
                    (furn_16[:,:,:3].astype(np.float32) * furn_alpha + 
                     composite[:,:,:3] * floor_alpha * (1 - furn_alpha)) / out_alpha,
                    0
                )
                composite[:,:,3:4] = out_alpha * 255
                composite = np.clip(composite, 0, 255).astype(np.uint8)
                
                score = advanced_tile_match(target, composite)
                if score < best_combo_score:
                    best_combo_score = score
                    best_combo = (floor_tile, furn_tile)
    
    # Return best option
    if best_combo and best_combo_score < best_single_score - 5:
        return 'LAYERED', best_combo, best_combo_score
    elif best_single:
        return 'SINGLE', best_single, best_single_score
    else:
        return 'UNKNOWN', None, 999

# Analyze all grid positions
print("\n=== ANALYZING GRID ===")
grid_data = {}
animated_positions = {}

for gy in range(GRID_H):
    for gx in range(GRID_W):
        px = gx * 16
        py = gy * 16
        
        # Check for animation first
        tiles_across_frames = [f[py:py+16, px:px+16] for f in frames_16]
        
        # Find unique tiles
        unique_tiles = []
        frame_to_unique = {}  # frame_index -> unique_index
        
        for fi in range(6):
            tile_bytes = tiles_across_frames[fi].tobytes()
            # Find existing
            unique_idx = None
            for ui, (existing_bytes, _) in enumerate(unique_tiles):
                if existing_bytes == tile_bytes:
                    unique_idx = ui
                    break
            
            if unique_idx is None:
                unique_idx = len(unique_tiles)
                unique_tiles.append((tile_bytes, tiles_across_frames[fi]))
            
            frame_to_unique[fi] = unique_idx
        
        # Analyze each unique tile
        if len(unique_tiles) == 1:
            # Static tile
            target = unique_tiles[0][1]
            match_type, match_data, score = find_layered_match(target, floor_tiles, furniture_tiles)
            grid_data[(gx, gy)] = {
                'type': 'static',
                'match_type': match_type,
                'match_data': match_data,
                'score': score
            }
        else:
            # Animated tile
            matches = []
            for _, unique_tile in unique_tiles:
                match_type, match_data, score = find_layered_match(unique_tile, floor_tiles, furniture_tiles)
                matches.append((match_type, match_data, score))
            
            animated_positions[(gx, gy)] = {
                'frame_to_unique': frame_to_unique,
                'matches': matches
            }
            grid_data[(gx, gy)] = {
                'type': 'animated',
                'data': animated_positions[(gx, gy)]
            }

print(f"Animated positions: {len(animated_positions)}")

# Convert to JSON-serializable format
def serialize_data():
    result = {}
    
    for pos, data in grid_data.items():
        key = f"{pos[0]},{pos[1]}"
        
        if data['type'] == 'static':
            if data['match_type'] == 'SINGLE':
                tile = data['match_data']
                result[key] = {
                    'type': 'single',
                    'sheet': tile[0], 'col': tile[1], 'row': tile[2],
                    'score': float(round(data['score'], 2))
                }
            elif data['match_type'] == 'LAYERED':
                floor_tile, furn_tile = data['match_data']
                result[key] = {
                    'type': 'layered',
                    'floor': {'sheet': floor_tile[0], 'col': floor_tile[1], 'row': floor_tile[2]},
                    'furniture': {'sheet': furn_tile[0], 'col': furn_tile[1], 'row': furn_tile[2]},
                    'score': float(round(data['score'], 2))
                }
            else:
                result[key] = {'type': 'unknown'}
        
        elif data['type'] == 'animated':
            anim_data = data['data']
            frames = []
            for match_type, match_data, score in anim_data['matches']:
                if match_type == 'SINGLE':
                    tile = match_data
                    frames.append({
                        'type': 'single',
                        'sheet': tile[0], 'col': tile[1], 'row': tile[2]
                    })
                elif match_type == 'LAYERED':
                    floor_tile, furn_tile = match_data
                    frames.append({
                        'type': 'layered',
                        'floor': {'sheet': floor_tile[0], 'col': floor_tile[1], 'row': floor_tile[2]},
                        'furniture': {'sheet': furn_tile[0], 'col': furn_tile[1], 'row': furn_tile[2]}
                    })
                else:
                    frames.append({'type': 'unknown'})
            
            result[key] = {
                'type': 'animated',
                'frames': frames,
                'frame_map': anim_data['frame_to_unique']
            }
    
    return result

serialized_data = serialize_data()

# Count stats
single_count = sum(1 for v in serialized_data.values() if v.get('type') == 'single')
layered_count = sum(1 for v in serialized_data.values() if v.get('type') == 'layered')  
unknown_count = sum(1 for v in serialized_data.values() if v.get('type') == 'unknown')
animated_count = sum(1 for v in serialized_data.values() if v.get('type') == 'animated')

print(f"\nTile breakdown: {single_count} single, {layered_count} layered, {unknown_count} unknown, {animated_count} animated")

# Generate improved HTML
html_template = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Office Design 2 - Modern Office Revamped</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #2a2a2a;
            font-family: 'Courier New', monospace;
            color: white;
        }
        .container {
            display: flex;
            gap: 20px;
            align-items: flex-start;
        }
        canvas {
            background: transparent;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
            border: 2px solid #555;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
        }
        .info-panel {
            min-width: 250px;
        }
        .controls {
            margin-bottom: 15px;
        }
        button {
            background: #444;
            color: white;
            border: 1px solid #666;
            padding: 8px 12px;
            margin: 2px;
            cursor: pointer;
            font-family: inherit;
            font-size: 11px;
        }
        button:hover {
            background: #555;
        }
        button.active {
            background: #0a84ff;
            border-color: #0a84ff;
        }
        .stats {
            font-size: 11px;
            line-height: 1.4;
        }
        .stat-line {
            margin: 3px 0;
        }
        h1 {
            margin: 0 0 15px 0;
            font-size: 24px;
        }
    </style>
</head>
<body>
    <h1>Office Design 2</h1>
    <div class="container">
        <canvas id="canvas" width="768" height="816"></canvas>
        <div class="info-panel">
            <div class="controls">
                <button id="toggleAnim" onclick="toggleAnimation()">⏸️ Pause</button><br>
                <button onclick="showFrame(0)">Frame 0</button>
                <button onclick="showFrame(1)">Frame 1</button>
                <button onclick="showFrame(2)">Frame 2</button><br>
                <button onclick="showFrame(3)">Frame 3</button>
                <button onclick="showFrame(4)">Frame 4</button>
                <button onclick="showFrame(5)">Frame 5</button>
            </div>
            <div class="stats">
                <div class="stat-line"><strong>Canvas:</strong> 768×816 pixels</div>
                <div class="stat-line"><strong>Grid:</strong> 16×17 tiles @ 48px</div>
                <div class="stat-line"><strong>Animation:</strong> 6 frames @ 100ms</div>
                <div class="stat-line">&nbsp;</div>
                <div class="stat-line"><strong>Tile Stats:</strong></div>
                <div class="stat-line">• Single: ''' + str(single_count) + '''</div>
                <div class="stat-line">• Layered: ''' + str(layered_count) + '''</div>
                <div class="stat-line">• Animated: ''' + str(animated_count) + '''</div>
                <div class="stat-line">• Unknown: ''' + str(unknown_count) + '''</div>
            </div>
        </div>
    </div>

    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        
        let roomBuilderImg = null;
        let modernOfficeImg = null;
        let currentFrame = 0;
        let isAnimating = true;
        let lastFrameTime = 0;
        const FRAME_DURATION = 100;
        
        const gridData = ''' + json.dumps(serialized_data) + ''';
        
        const loadImages = async () => {
            const loadImg = (src) => new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
            
            try {
                roomBuilderImg = await loadImg('../lib/sprites/modern-office-revamped/1_Room_Builder_Office/Room_Builder_Office_48x48.png');
                modernOfficeImg = await loadImg('../lib/sprites/modern-office-revamped/Modern_Office_48x48.png');
                console.log('✅ Tilesets loaded');
                render();
                animate();
            } catch (error) {
                console.error('❌ Failed to load images:', error);
                render(); // Render with placeholders
            }
        };
        
        const drawTile = (sheet, col, row, x, y) => {
            const img = sheet === 'RB' ? roomBuilderImg : modernOfficeImg;
            if (img) {
                ctx.drawImage(img, col * 48, row * 48, 48, 48, x, y, 48, 48);
            } else {
                // Fallback
                ctx.fillStyle = sheet === 'RB' ? '#8B4513' : '#4682B4';
                ctx.fillRect(x, y, 48, 48);
            }
        };
        
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            for (const [posKey, tileData] of Object.entries(gridData)) {
                const [gx, gy] = posKey.split(',').map(Number);
                const x = gx * 48;
                const y = gy * 48;
                
                if (tileData.type === 'single') {
                    drawTile(tileData.sheet, tileData.col, tileData.row, x, y);
                }
                else if (tileData.type === 'layered') {
                    // Draw floor first, then furniture
                    drawTile(tileData.floor.sheet, tileData.floor.col, tileData.floor.row, x, y);
                    drawTile(tileData.furniture.sheet, tileData.furniture.col, tileData.furniture.row, x, y);
                }
                else if (tileData.type === 'animated') {
                    const uniqueIndex = tileData.frame_map[currentFrame.toString()];
                    const frameData = tileData.frames[uniqueIndex];
                    
                    if (frameData.type === 'single') {
                        drawTile(frameData.sheet, frameData.col, frameData.row, x, y);
                    } else if (frameData.type === 'layered') {
                        drawTile(frameData.floor.sheet, frameData.floor.col, frameData.floor.row, x, y);
                        drawTile(frameData.furniture.sheet, frameData.furniture.col, frameData.furniture.row, x, y);
                    } else {
                        // Unknown animated tile
                        ctx.fillStyle = '#FF1493';
                        ctx.fillRect(x, y, 48, 48);
                    }
                }
                else {
                    // Unknown static tile
                    ctx.fillStyle = '#FF6347';
                    ctx.fillRect(x, y, 48, 48);
                }
            }
        };
        
        const animate = (time = 0) => {
            if (isAnimating && time - lastFrameTime >= FRAME_DURATION) {
                currentFrame = (currentFrame + 1) % 6;
                lastFrameTime = time;
                render();
            }
            requestAnimationFrame(animate);
        };
        
        const toggleAnimation = () => {
            isAnimating = !isAnimating;
            document.getElementById('toggleAnim').textContent = isAnimating ? '⏸️ Pause' : '▶️ Play';
        };
        
        const showFrame = (frame) => {
            currentFrame = frame;
            isAnimating = false;
            document.getElementById('toggleAnim').textContent = '▶️ Play';
            render();
        };
        
        window.toggleAnimation = toggleAnimation;
        window.showFrame = showFrame;
        
        loadImages();
    </script>
</body>
</html>'''

# Write the improved HTML
with open('/Users/apocys/.openclaw/workspace/fleetkit-v2/office-modern-v2/index.html', 'w') as f:
    f.write(html_template)

print("\n🎯 FINAL RESULT:")
print(f"📁 File: office-modern-v2/index.html")
print(f"📐 Size: 768×816 pixels (16×17 tiles at 48px)")
print(f"🎬 Animation: {animated_count} animated positions")
print(f"✅ Quality: {single_count + layered_count + animated_count}/{GRID_W*GRID_H} tiles successfully matched")
print(f"📊 Breakdown: {single_count} single + {layered_count} layered + {animated_count} animated + {unknown_count} unknown")