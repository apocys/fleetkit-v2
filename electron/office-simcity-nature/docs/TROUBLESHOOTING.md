# Troubleshooting — SpawnKit SimCity Theme

## Common Issues

### Sprites don't load / agents are invisible
**Cause:** The theme loads ~1700 sprite images from the `lib/sprites/` directory.
**Fix:**
1. Ensure you're running a local HTTP server (not opening with `file://`)
2. Verify the directory structure: `lib/sprites/kenney-nature-kit/Isometric/` and `lib/sprites/kenney-mini-chars-upright/`
3. Check browser console for 404 errors on sprite paths
4. The loading bar should reach 100% — if it stalls, a sprite path is wrong

### Ground is visible but objects/trees are missing
**Cause:** Object sprites failed to load.
**Fix:** Check that all PNG files in `lib/sprites/kenney-nature-kit/Isometric/` are present. The theme requires files like `tree_default_NE.png`, `tent_detailedOpen_NE.png`, etc.

### Characters don't animate / show as static images
**Cause:** Character animation frames didn't load.
**Fix:** Verify `lib/sprites/kenney-mini-chars-upright/` contains all 6 character directories, each with `idle_*` and `walk_*` subdirectories containing `NE/NW/SE/SW` directions with `frame_000.png` through `frame_007.png`.

### Canvas is black / nothing renders
**Cause:** Canvas element not initialized.
**Fix:**
1. Check browser console for JavaScript errors
2. Ensure `index.html` and `src/data-bridge.js` are in correct relative positions
3. Try a different browser

### Panning/zooming feels laggy
**Cause:** Too many sprites being rendered on a slow GPU.
**Fix:**
1. Enable hardware acceleration in browser settings
2. Zoom in to reduce visible tile count
3. Close other GPU-heavy tabs
4. The theme renders on Canvas 2D which is CPU-bound

### Agents don't move / stay at their tents
**Cause:** Behavior timer hasn't triggered yet.
**Fix:** Wait 5-15 seconds — agents have random delays before their first movement. If still stuck, check for JavaScript errors in the console.

### Loading bar stuck at a percentage
**Cause:** Some sprite images failed to load (404 or network error).
**Fix:**
1. Check the browser console for "Missing:" warnings
2. The loading continues even on errors — it may be a slow connection
3. Missing sprites won't crash the theme but will leave empty spots

### Labels overlap or appear in wrong positions
**Cause:** Window was resized after initial render.
**Fix:** Agent labels are repositioned on zoom/pan. Try resetting the view with the ⌂ button.

## Performance Tips

- The theme loads ~1700 sprites but renders only visible ones
- Canvas uses painter's algorithm (back-to-front) per frame
- Character tinting is cached after first computation
- Reduce zoom level to see more tiles without scrolling

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Full support, best performance |
| Firefox | 88+ | Full support |
| Safari | 15+ | Full support |
| Edge | 90+ | Full support |
| iOS Safari | 15+ | Works but may be slow with many sprites |

## Need Help?

Open an issue at the SpawnKit repository or contact support.
