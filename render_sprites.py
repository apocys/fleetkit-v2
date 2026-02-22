"""
Batch Isometric Sprite Renderer for Kenney Mini Characters
Renders GLB characters from 4 isometric directions with animations → PNG sprite sheets.

Usage: blender --background --python render_sprites.py
"""

import bpy
import os
import sys
import math
import mathutils

# ─── CONFIG ───────────────────────────────────────────────────
INPUT_DIR = "/home/apocyz_runner/clawd/kenney-research/kira-pack/Models/GLB format"
OUTPUT_DIR = "/home/apocyz_runner/clawd/kenney-research/rendered-sprites"
RENDER_SIZE = 256  # output pixel size per frame
DIRECTIONS = {
    "SE": 45,    # front-right (default isometric view)
    "SW": 135,   # front-left
    "NW": 225,   # back-left
    "NE": 315,   # back-right
}
# Which animations to render (subset for office theme)
ANIMATIONS_TO_RENDER = [
    "idle", "walk", "sprint", "sit", "pick-up",
    "emote-yes", "emote-no", "interact-right", "interact-left",
    "crouch", "die",
]
CAMERA_ELEVATION = 30  # degrees from horizontal (isometric standard)
CAMERA_DISTANCE = 3.5  # distance from origin
FPS = 8  # sprite animation fps


def setup_scene():
    """Clean scene and set up isometric rendering."""
    # Delete everything
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Render settings
    scene = bpy.context.scene
    scene.render.resolution_x = RENDER_SIZE
    scene.render.resolution_y = RENDER_SIZE
    scene.render.film_transparent = True  # transparent background
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.engine = 'BLENDER_EEVEE_NEXT'  # fast rendering

    # EEVEE settings for flat look
    if hasattr(scene, 'eevee'):
        scene.eevee.use_bloom = False

    # World: solid white ambient light (flat shading feel)
    world = bpy.data.worlds.new("FlatWorld")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (1.0, 1.0, 1.0, 1.0)
        bg.inputs[1].default_value = 0.8  # ambient strength

    # Add sun light for directional shading
    bpy.ops.object.light_add(type='SUN', location=(5, -5, 10))
    sun = bpy.context.active_object
    sun.data.energy = 2.0
    sun.rotation_euler = (math.radians(45), 0, math.radians(45))

    # Add fill light
    bpy.ops.object.light_add(type='SUN', location=(-3, 3, 8))
    fill = bpy.context.active_object
    fill.data.energy = 0.5
    fill.rotation_euler = (math.radians(60), 0, math.radians(-135))


def create_camera():
    """Create isometric orthographic camera."""
    bpy.ops.object.camera_add()
    cam = bpy.context.active_object
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 2.2  # adjust to fit character
    cam.data.clip_start = 0.1
    cam.data.clip_end = 100
    bpy.context.scene.camera = cam
    return cam


def position_camera(cam, angle_deg):
    """Position camera at given horizontal angle around origin."""
    angle_rad = math.radians(angle_deg)
    elev_rad = math.radians(CAMERA_ELEVATION)

    x = CAMERA_DISTANCE * math.cos(elev_rad) * math.cos(angle_rad)
    y = CAMERA_DISTANCE * math.cos(elev_rad) * math.sin(angle_rad)
    z = CAMERA_DISTANCE * math.sin(elev_rad)

    cam.location = (x, y, z)

    # Point at origin (slightly above ground for character center)
    target = mathutils.Vector((0, 0, 0.7))
    direction = target - cam.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()


def import_glb(filepath):
    """Import a GLB file and return the armature."""
    bpy.ops.import_scene.gltf(filepath=filepath)

    armature = None
    mesh_objects = []
    for obj in bpy.context.selected_objects:
        if obj.type == 'ARMATURE':
            armature = obj
        elif obj.type == 'MESH':
            mesh_objects.append(obj)

    return armature, mesh_objects


def get_animation_info(armature):
    """Get all animations available for this armature."""
    anims = {}
    if armature and armature.animation_data:
        for action in bpy.data.actions:
            name = action.name
            frame_start = int(action.frame_range[0])
            frame_end = int(action.frame_range[1])
            anims[name] = {
                'action': action,
                'start': frame_start,
                'end': frame_end,
                'frames': frame_end - frame_start + 1
            }
    return anims


def render_character(glb_path, cam):
    """Render one character in all directions × animations."""
    basename = os.path.splitext(os.path.basename(glb_path))[0]
    char_dir = os.path.join(OUTPUT_DIR, basename)

    print(f"\n{'='*60}")
    print(f"Rendering: {basename}")
    print(f"{'='*60}")

    # Import
    armature, meshes = import_glb(glb_path)
    if not armature:
        print(f"  WARNING: No armature found in {basename}, skipping")
        return

    # Center at origin
    armature.location = (0, 0, 0)
    armature.rotation_euler = (0, 0, 0)

    # Get animations
    anims = get_animation_info(armature)
    print(f"  Found {len(anims)} animations: {', '.join(anims.keys())}")

    # Filter to desired animations (action names may have suffixes like _characterName)
    render_anims = {}
    for k, v in anims.items():
        # Strip any suffix after the base animation name
        base_name = k.split('_')[0] if '_' in k else k
        # Also try the full name with hyphens
        if (base_name in ANIMATIONS_TO_RENDER or
            k in ANIMATIONS_TO_RENDER or
            k.replace('-', '_') in ANIMATIONS_TO_RENDER or
            any(k.startswith(a) for a in ANIMATIONS_TO_RENDER)):
            render_anims[k] = v

    if not render_anims:
        # Fallback: at minimum render idle and walk
        for k, v in anims.items():
            if any(x in k.lower() for x in ['idle', 'walk']):
                render_anims[k] = v
        if not render_anims:
            # Last resort: first 5 animations
            render_anims = dict(list(anims.items())[:5])

    for anim_name, anim_info in render_anims.items():
        action = anim_info['action']
        frame_start = anim_info['start']
        frame_end = anim_info['end']
        total_frames = anim_info['frames']

        # Sample frames (max 8 frames per animation for sprite sheet)
        max_frames = 8
        if total_frames <= max_frames:
            sample_frames = list(range(frame_start, frame_end + 1))
        else:
            step = total_frames / max_frames
            sample_frames = [int(frame_start + i * step) for i in range(max_frames)]

        # Set active action
        armature.animation_data.action = action

        for dir_name, dir_angle in DIRECTIONS.items():
            anim_dir = os.path.join(char_dir, anim_name, dir_name)
            os.makedirs(anim_dir, exist_ok=True)

            position_camera(cam, dir_angle)

            for fi, frame in enumerate(sample_frames):
                bpy.context.scene.frame_set(frame)
                outpath = os.path.join(anim_dir, f"frame_{fi:03d}.png")
                bpy.context.scene.render.filepath = outpath
                bpy.ops.render.render(write_still=True)

            print(f"  ✓ {anim_name}/{dir_name}: {len(sample_frames)} frames")

    # Create sprite sheet per animation/direction
    create_sprite_sheets(char_dir, basename)

    # Clean up imported objects
    bpy.ops.object.select_all(action='SELECT')
    # Keep camera and lights
    cam.select_set(False)
    for obj in bpy.data.objects:
        if obj.type == 'LIGHT':
            obj.select_set(False)
    bpy.ops.object.delete(use_global=False)


def create_sprite_sheets(char_dir, char_name):
    """Combine individual frames into horizontal sprite sheets."""
    try:
        # Use Blender's compositor or PIL-like approach with bpy
        pass  # We'll combine with a separate script or leave as individual frames
    except Exception as e:
        print(f"  Note: Sprite sheet creation deferred ({e})")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    setup_scene()
    cam = create_camera()

    # Find character GLB files — prioritize 6 key agents, then rest
    PRIORITY_CHARS = [
        "character-male-a",    # CEO
        "character-male-c",    # CTO
        "character-male-d",    # CRO
        "character-female-a",  # COO
        "character-female-c",  # CMO
        "character-male-e",    # Auditor
    ]
    all_chars = sorted([f for f in os.listdir(INPUT_DIR)
                        if f.startswith("character-") and f.endswith(".glb")])
    priority = [f for f in all_chars if os.path.splitext(f)[0] in PRIORITY_CHARS]
    rest = [f for f in all_chars if os.path.splitext(f)[0] not in PRIORITY_CHARS]
    glb_files = [os.path.join(INPUT_DIR, f) for f in priority + rest]

    print(f"\nFound {len(glb_files)} character files:")
    for f in glb_files:
        print(f"  {os.path.basename(f)}")

    # Render each
    for glb_path in glb_files:
        try:
            render_character(glb_path, cam)
        except Exception as e:
            print(f"ERROR rendering {glb_path}: {e}")
            import traceback
            traceback.print_exc()

    print(f"\n{'='*60}")
    print(f"DONE — Output: {OUTPUT_DIR}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
