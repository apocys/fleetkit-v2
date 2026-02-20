# SpawnKit v2 - Sprite Generation Guide

*Research completed: 2026-02-18*  
*Goal: Generate 5 animated isometric pixel art characters (Habbo Hotel style) for virtual office*

## Executive Summary

**🏆 FASTEST PATH:** PixelLab.ai + Piskel refinement = **4-6 hours total**
- Cost: ~$25-50 for all 5 characters with animations  
- Quality: Professional game-ready sprites
- Speed: Generate base characters in 1 hour, animate in 3-5 hours

---

## 1. Tool Comparison (Ranked by Speed + Quality)

### 🥇 PixelLab.ai - **WINNER for Production**
- **Pricing:** $0.007-0.011 per 64x64 sprite (~$2-4 per character set)
- **Speed:** ⭐⭐⭐⭐⭐ Instant generation
- **Quality:** ⭐⭐⭐⭐⭐ Game-ready, consistent style
- **Animation:** ✅ Built-in text-to-animation, skeleton controls
- **Isometric:** ✅ Perfect 4/8-directional rotation support
- **Best for:** Professional production, consistent style across characters

### 🥈 Pixel Engine - Animation Specialist  
- **Pricing:** $12-60/month (2,000-12,000 credits)
- **Speed:** ⭐⭐⭐⭐ (~20 credits per animation)
- **Quality:** ⭐⭐⭐⭐ Excellent AI animation from static sprites
- **Animation:** ✅ AI-powered motion from text prompts
- **Isometric:** ⚠️ Limited isometric support
- **Best for:** Animating existing sprites, creative motion

### 🥉 Aseprite - Manual Excellence
- **Pricing:** $19.99 one-time
- **Speed:** ⭐⭐ Manual work (8-16 hours per character)
- **Quality:** ⭐⭐⭐⭐⭐ Industry standard
- **Animation:** ✅ Full manual control, onion skinning
- **Isometric:** ✅ Complete control over perspective
- **Best for:** Hand-crafted perfection, learning pixel art

### 4. Piskel - Free Manual Option
- **Pricing:** Free
- **Speed:** ⭐⭐ Manual work (6-12 hours per character)  
- **Quality:** ⭐⭐⭐ Good for simple sprites
- **Animation:** ✅ Basic animation tools
- **Isometric:** ⚠️ Manual perspective work needed
- **Best for:** Budget option, simple sprites, refinement

### 5. Midjourney/DALL-E - Concept Art
- **Pricing:** $10-60/month
- **Speed:** ⭐⭐⭐ Fast concept, slow refinement
- **Quality:** ⭐⭐⭐ Needs heavy post-processing
- **Animation:** ❌ No animation support
- **Isometric:** ❌ Poor pixel art precision
- **Best for:** Initial concepts only, not production

### 6. Sprite-AI.art - Budget Option
- **Pricing:** Free tier + paid plans
- **Speed:** ⭐⭐⭐ Good generation speed
- **Quality:** ⭐⭐⭐ Decent for simple sprites
- **Animation:** ❌ Limited animation features
- **Isometric:** ⚠️ Basic support
- **Best for:** Quick prototypes, budget constraints

---

## 2. Fastest Production Pipeline ⚡

### Phase 1: Character Generation (1 hour)
1. **PixelLab.ai Setup**
   - Create account at pixellab.ai
   - Purchase credits (~$10 minimum for 5 characters)

2. **Generate Base Characters** (15 min each)
   - Prompt template: `isometric business character, Habbo Hotel style, [role description], clean pixel art, 32x32, transparent background`
   - Example prompts:
     - `"CEO character, suit and tie, confident pose, isometric business character, Habbo Hotel style, clean pixel art, 32x32"`
     - `"Developer character, hoodie and glasses, laptop, isometric business character, Habbo Hotel style, clean pixel art, 32x32"`
     - `"Designer character, creative casual wear, tablet, isometric business character, Habbo Hotel style, clean pixel art, 32x32"`
     - `"Manager character, professional attire, clipboard, isometric business character, Habbo Hotel style, clean pixel art, 32x32"`
     - `"Support character, headset and uniform, friendly pose, isometric business character, Habbo Hotel style, clean pixel art, 32x32"`

3. **Generate 4-Directional Views**
   - Use PixelLab's rotation feature for each character
   - Export: North, East, South, West facing sprites

### Phase 2: Animation Creation (3-4 hours)
1. **PixelLab Animation** (2-3 hours)
   - Use text-to-animation: `"character walking idle animation, 4 frames"`
   - Generate for each direction: idle, walk, work animations
   - Export as individual frames

2. **Piskel Refinement** (1 hour)
   - Import frames into Piskel for cleanup
   - Adjust timing (200-300ms per frame for idle, 150ms for walk)
   - Fine-tune pixel consistency
   - Add subtle details if needed

### Phase 3: Sprite Sheet Export (30 minutes)
1. **Organize Frames**
   - Layout: 8 columns (2 animations × 4 directions), 5 rows (1 per character)
   - Frame size: 48x48 pixels (gives padding around 32x32 sprites)
   - Total sheet: 384×240 pixels

2. **Export Format**
   - Format: PNG with alpha transparency
   - Color depth: 8-bit indexed color (256 colors max)
   - Naming: `spawnkit-characters-v1.png`

### Phase 4: PixiJS Integration (1 hour)
1. **Load Sprite Sheet**
```javascript
// Load the sprite sheet
const texture = await PIXI.Assets.load('sprites/spawnkit-characters-v1.png');

// Define frame data
const spriteData = {
    frames: {
        'ceo-idle-north-1': { frame: { x: 0, y: 0, w: 48, h: 48 }},
        'ceo-idle-north-2': { frame: { x: 48, y: 0, w: 48, h: 48 }},
        // ... continue for all frames
    },
    meta: { 
        image: 'spawnkit-characters-v1.png',
        format: 'RGBA8888',
        size: { w: 384, h: 240 }
    }
};
```

2. **Create Animations**
```javascript
// Create animated sprite
const ceoIdleNorth = new PIXI.AnimatedSprite([
    PIXI.Texture.from('ceo-idle-north-1'),
    PIXI.Texture.from('ceo-idle-north-2')
]);
ceoIdleNorth.animationSpeed = 0.1;
ceoIdleNorth.play();
```

---

## 3. Sprite Sheet Specification 📋

### Technical Specs
- **Character Size:** 32×32 pixels (base sprite)
- **Frame Size:** 48×48 pixels (with padding)
- **Animation States:**
  - Idle: 2-3 frames (breathing, blinking)
  - Walk: 4 frames (step cycle)
  - Work: 2-4 frames (typing, thinking)
- **Directions:** 4 (North, East, South, West)
- **Total Frames per Character:** 8-11 frames

### Sprite Sheet Layout
```
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ CEO │ CEO │ CEO │ CEO │ CEO │ CEO │ CEO │ CEO │
│ I-N1│ I-N2│ W-N1│ W-N2│ I-E1│ I-E2│ W-E1│ W-E2│ 48px
├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ DEV │ DEV │ DEV │ DEV │ DEV │ DEV │ DEV │ DEV │
│Similar pattern for each character...         │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
  48px  48px  48px  48px  48px  48px  48px  48px
```

### File Format
- **Format:** PNG-24 with alpha transparency
- **Color Depth:** 8-bit per channel (24-bit + 8-bit alpha)
- **Compression:** PNG optimization for web
- **Dimensions:** 384×240 pixels (8×5 grid)

### Habbo Hotel Style Guidelines
- **Strong black outlines** (1-2 pixels wide)
- **Simple shadows** (single dark color, no gradients)  
- **High contrast colors** (vibrant, saturated palette)
- **Minimal detail** but maximum personality
- **Isometric perspective** (30° rotation from front view)
- **Consistent lighting** (top-left light source)

---

## 4. Cost & Time Estimate 💰

### Development Costs
| Tool | Cost | Usage |
|------|------|--------|
| PixelLab.ai | $25 | Character generation + animation |
| Piskel | Free | Refinement and cleanup |
| **Total** | **$25** | **Complete sprite set** |

### Time Breakdown
| Phase | Time | Task |
|-------|------|------|
| Character Generation | 1 hour | 5 base characters + rotations |
| Animation Creation | 3-4 hours | Idle/walk animations |  
| Refinement | 1 hour | Cleanup in Piskel |
| Integration | 1 hour | PixiJS setup |
| **Total** | **6-7 hours** | **Production ready** |

### Automation Opportunities
- **PixelLab API:** Batch generate multiple characters
- **Sprite sheet packing:** Use TexturePacker for optimization
- **Animation templates:** Reuse motion patterns across characters
- **CI/CD integration:** Auto-generate on character updates

### Scaling Costs
- **10 characters:** ~$50, 12 hours
- **25 characters:** ~$125, 30 hours  
- **Custom animations:** +$5-10 per character per animation

---

## 5. Quick Win: CSS/Canvas Fallback 🎨

If sprite generation takes too long, here's the emergency backup plan:

### Option A: Geometric CSS Characters (2 hours)
```css
.character {
    width: 32px; height: 32px;
    border: 2px solid #000;
    position: relative;
}

.ceo { 
    background: linear-gradient(135deg, #333 50%, #666 50%);
    border-radius: 2px 2px 0 0;
}

.ceo::before {
    content: '';
    position: absolute;
    top: -4px; left: 50%;
    transform: translateX(-50%);
    width: 8px; height: 8px;
    background: #F4C2A1; /* skin tone */
    border: 1px solid #000;
    border-radius: 50%;
}
```

### Option B: 16×16 Hand-Drawn (4 hours)
- Create minimal 16×16 pixel sprites in Piskel
- 4 colors per character maximum
- Simple 2-frame animations (static + blink)
- Scale up 2× for display (32×32 rendered size)

### Option C: Emoji Characters (30 minutes)
```javascript
const characters = {
    ceo: { emoji: '👔', name: 'CEO' },
    dev: { emoji: '👨‍💻', name: 'Developer' },  
    designer: { emoji: '👩‍🎨', name: 'Designer' },
    manager: { emoji: '👩‍💼', name: 'Manager' },
    support: { emoji: '🎧', name: 'Support' }
};

// CSS animation for "movement"
.emoji-character {
    font-size: 32px;
    animation: bounce 2s infinite;
}
```

### Emergency Timeline
- **CSS Geometric:** 2 hours → Deploy today
- **16×16 Hand-drawn:** 4 hours → Deploy tomorrow  
- **Emoji Fallback:** 30 minutes → Deploy now

---

## Action Items for TODAY 🚀

1. **Immediate (Next 2 hours):**
   - [ ] Sign up for PixelLab.ai
   - [ ] Generate first test character
   - [ ] Verify isometric quality matches Habbo Hotel style

2. **This afternoon (4 hours):**
   - [ ] Generate all 5 base characters
   - [ ] Create 4-directional rotations
   - [ ] Start animation generation

3. **Fallback Plan:**
   - [ ] If PixelLab fails → Implement CSS geometric characters
   - [ ] Create basic CSS animations for movement
   - [ ] Test in PixiJS environment

## Success Criteria ✅

- [ ] 5 distinct character sprites (CEO, Dev, Designer, Manager, Support)
- [ ] 4 directional views each (North, East, South, West)  
- [ ] 2+ animation states (Idle, Walk minimum)
- [ ] Habbo Hotel aesthetic (isometric, outlined, colorful)
- [ ] PixiJS-compatible sprite sheets
- [ ] Total cost under $50
- [ ] Deliverable within 24 hours

---

*Generated by Hunter (CRO) - Market research focused on fastest time-to-market for SpawnKit v2 virtual office sprites*