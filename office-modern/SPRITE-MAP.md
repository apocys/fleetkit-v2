# SPRITE-MAP.md — Verified Tile Coordinates

## Sheets Reference
- **rb** = Room_Builder_free_16x16.png (272×368 = 17c × 23r)
- **orb** = Room_Builder_Office_16x16.png (256×224 = 16c × 14r)  
- **int** = Interiors_free_16x16.png (256×1424 = 16c × 89r)
- **off** = Modern_Office_Shadowless_16x16.png (256×848 = 16c × 53r)

## Wall Tiles (orb)

### Grey Office Walls (main style)
- **Cap/top:** r0 c1-c4 (38-44% filled, grey ~195,195,201) — partial fill = top molding
- **Face:** r1 c1-c4 (38% filled, grey ~187,187,194) — wall face
- **Baseboard:** r2 c1-c4 (65% filled, grey ~190,190,196) — bottom trim 
- **Shadow:** r3 c1-c4 (65% filled, grey ~194-200) — floor shadow cast

### Solid wall block (for fill)
- r0 c8: 100% solid (58,58,80) — dark fill block
- r2 c3-c4: 100% filled (214,214,218) — bright wall fill
- r2 c5: 100% filled (214,214,218) — wall fill

### White/bright wall alternatives (orb)
- c10-c12 r0-r3: Bright white walls (217-248 range) — r0:(217,220,217), r1:(224,214), r2:(228,236,228), r3:(236,248,236)

### Side wall / vertical (orb)
- r1 c5-c6: 65% filled (184-186) — vertical wall caps
- r1 c7: 44% (177,177,185) — thin vertical
- r1 c9: 44% (177,177,185) — thin vertical  

### Black shadow overlay (orb)
- r1 c13: 65% (0,0,0) — shadow
- r2 c13: 38% (0,0,0) — lighter shadow
- r1 c14: 44% (0,0,0), r1 c15: 16% (0,0,0)

## Floor Tiles

### Grey/Blue Carpet (rb)
- r17 c0-c9: 100% filled (169-188 blue-grey range)
  - c0:(169,171,184) c1:(176,178,191) c2:(169,171,184) c3:(172,174,186)
  - Pattern: c0/c2 = dark variant, c1/c3 = light variant (2×2 repeat using x%2, y%2 on r17-r18)
- r18 c0-c9: 100% filled (149-163 range) — darker row of carpet

### Wood Floor (rb)  
- r7 c0-c9: 100% filled (207-239 yellow-brown)
  - c0:(207,196,160) c1:(217,205,165) — light yellow wood
- r8 c0-c9: 100% filled (206-216 brown)
  - c0:(206,171,126) c1:(216,179,130) — darker brown wood

### Light/Cream Tile (rb)
- r19 c0-c9: 100% filled (180-200 beige)
- r20 c0-c9: 100% filled (165-180 slightly darker)

### Purple Office Carpet (orb)
- r5 c0-c9: 100% filled (188-209 purple-grey)
  - c0:(188,185,201) c1:(197,194,209) — purple tinted
- r6 c0-c9: 100% filled (166-182 darker purple)

### Grey Neutral (orb)
- r7 c0-c9: 100% filled (174-200 neutral grey)
- r8 c0-c9: 100% filled (155-169 darker neutral)

### Warm Stone/Brown (orb)
- r9 c0-c9: 100% filled (143-175 warm brownish)
- r10 c0-c9: 100% filled (130-141 darker)

### Dark Grey/Concrete (orb)
- r7 c10-c12: 100% (104-109 dark grey)
- r8 c10-c12: 100% (100-110 dark grey)

### Brown Wood (orb)
- r7 c13-c15: 100% (103,95,75 - brownish) 
- r8 c13-c15: 100% (100,92,72 - darker brown)

## Office Furniture (off = Modern Office Shadowless)

### Desks — Wood (3 wide × 4 tall)
- **Top:** r0 c0-c4 (44% filled ~177,157,135 — top edge of desk)
- **Face:** r1 c0-c4 (94-100% filled ~196,172,143 — main desk surface) 
- **Front:** r2 c0-c4 (81-100% filled ~192,169,141 — front panel)
- **Legs:** r3 c0-c4 (66% filled ~147,131,123 — desk legs)
- Variants: c0-c4 = wood desk, c5-c9 = blue/purple desk, c10-c14 = grey desk

### Desks — Purple/Blue Variant
- r4-r7 c5-c9 (same structure, purple ~185,179,196)

### Desks — Another wood variant
- r4-r7 c0-c4 (185,171,148 slightly different tone)

### Monitors/Screens (off)
- r8 c0-c5: Dark blue-grey items (80-86% filled, 79-86 RGB) — computer monitors
- r9 c0-c5: Continuation (71-73%, ~79-85 RGB)
- r8 c6-c9: Mixed green/purple items
- r10-r11 c0-c5: Red/warm items (136-154 RGB) — could be frames or decorative

### Filing Cabinets (off)
- r40 c0-c1: 100% filled (107,107,110) grey — TOP of cabinet
- r41 c1-c3: 19-100% (100-115 grey) — middle  
- r42 c1-c3: 86-91% (104-108 grey) — bottom
- **CONFIRMED**: r40-r42 c0-c3 is indeed filing cabinet area

### More Desks (off)
- r34-r36 c0-c2: Large desk (170-190 brown)
- r37-r39 c0-c2: Another desk variant
- r43-r45: More desk/table pieces
- r46-r48 c0-c2: Purple desk variants
- r49-r51 c0-c2: Grey desk/cabinet variants

## Interior Items (int = Interiors Free)

### Plants (int)
- r0-r2 c1: Large green plant (177-168 green, tall 3-tile)
- r0-r2 c4: Another plant variant
- r0-r2 c10-c12: Teal/dark green plants (150-170 teal range)

### Sofa/Seating (int)
- r0-r2 c0-c3: Something with green tones — likely a bush/hedge or tall furniture
- r3-r4 c3-c4: Darker items (108,107,114 to 130,144,128) — could be shelf/bookcase base

### Tables (int)
- r10-r11 c0-c9: Table/desk area
  - c1-c2 r10: 94% (193,132,85) — brown desk surface 
  - c1-c2 r11: 100% (202,136,84) — desk front
  - c6-c7 r10: 94% (214,177,111) — lighter table
  - c6-c7 r11: 100% (224,184,112) — lighter front

### Bookshelves (int)
- r13-r15 c0-c1: Dark items (26-61% filled, ~103-155 grey-brown) — upper shelf
- r42-r43 c0-c5: 71-88% filled (142-159 brown-green) — bookshelf/storage

### Lamps (int)
- r33 c0-c8: 100% filled — single-tile items (ceiling lights/lamps)
  - c0: (187,142,94) warm — ceiling lamp
  - c1: (180,137,94) warm 
  - c2: (156,147,143) neutral — wall sconce?
  - c3: (171,102,72) dark orange — lamp shade
  - c6: (174,153,132) warm — another lamp
  - c8: (152,150,154) grey — modern lamp

### Bathroom/Kitchen (int)
- r24-r25 c0-c3: Mixed items with blue/grey tones — kitchen/bathroom
- r26-r27 c0-c3: Tables/counters (158-166 grey)
- r26-r27 c5-c8: Brown tables (172-203 warm)

### Beds (int) — AVOID
- r28-r29 c5-c6: PINK tiles (198,182,184) — THIS IS A BED, was incorrectly used as "whiteboard"!

### Rugs/Mats (int)  
- r28-r29 c0-c3: Grey/blue fabric items (160-177 range)
- r77-r83: Large multi-tile patterns — area rugs

### Chairs (int)
- r44-r47 c0-c7: Various chair types (130-155 range, mixed fills)
  - NOT at r4-r5 (those are plants/shelves!)

### Desk Accessories (int)
- r33 c0-c8: Single-tile items — lamps, clocks, small objects
- r35 c0: Small item (15% = tiny)
- r48-r50: Multi-tile desk setups with monitors

## Character Sprites

### Adam (16×32 per frame, 24 frames = 4 dirs × 6 frames)
- idle: Adam_idle_anim_16x16.png (384×32)
- run: Adam_run_16x16.png (384×32)  
- sit: Adam_sit_16x16.png (384×32)
- phone: Adam_phone_16x16.png (varies)

### Alex, Amelia, Bob — same frame layout
