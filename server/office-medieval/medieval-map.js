/**
 * medieval-map.js — Castle tile map layout + furniture + zone boundaries
 * A hand-crafted 2D top-down castle with zones matching the personality system.
 */
(function () {
  'use strict';
  var T = window.MedTypes.MedTileType;

  var COLS = 48;
  var ROWS = 40;

  var S = T.FLOOR_STONE;
  var W = T.WALL_CASTLE;
  var V = T.VOID;
  var WD = T.FLOOR_WOOD;
  var D = T.FLOOR_DIRT;
  var G = T.FLOOR_GRASS;
  var WA = T.FLOOR_WATER;
  var TW = T.WALL_TOWER;

  function generateMap() {
    var map = [];
    for (var r = 0; r < ROWS; r++) {
      map[r] = [];
      for (var c = 0; c < COLS; c++) {
        map[r][c] = G;
      }
    }

    function fillRect(startR, startC, h, w, tile) {
      for (var r = startR; r < startR + h && r < ROWS; r++) {
        for (var c = startC; c < startC + w && c < COLS; c++) {
          if (r >= 0 && c >= 0) map[r][c] = tile;
        }
      }
    }

    function wallRect(startR, startC, h, w, tile) {
      tile = tile || W;
      for (var r = startR; r < startR + h && r < ROWS; r++) {
        for (var c = startC; c < startC + w && c < COLS; c++) {
          if (r >= 0 && c >= 0) {
            if (r === startR || r === startR + h - 1 || c === startC || c === startC + w - 1) {
              map[r][c] = tile;
            }
          }
        }
      }
    }

    // ── MAIN CASTLE (center) ──
    fillRect(4, 8, 24, 32, S);
    wallRect(4, 8, 24, 32);

    // Corner towers (3x3)
    fillRect(3, 7, 4, 4, TW);
    fillRect(3, 37, 4, 4, TW);
    fillRect(25, 7, 4, 4, TW);
    fillRect(25, 37, 4, 4, TW);

    // ── THRONE ROOM (castle zone) ──
    fillRect(5, 18, 8, 12, S);
    wallRect(5, 18, 8, 12);
    map[12][23] = S; map[12][24] = S;
    fillRect(6, 19, 6, 10, S);

    // ── THE FORGE ──
    fillRect(5, 9, 7, 8, S);
    wallRect(5, 9, 7, 8);
    map[11][12] = S; map[11][13] = S;

    // ── THE LIBRARY ──
    fillRect(5, 31, 7, 8, WD);
    wallRect(5, 31, 7, 8);
    map[11][34] = WD; map[11][35] = WD;

    // ── THE TAVERN ──
    fillRect(17, 9, 7, 9, WD);
    wallRect(17, 9, 7, 9);
    map[17][13] = WD; map[17][14] = WD;

    // ── THE CHAPEL ──
    fillRect(17, 31, 7, 8, S);
    wallRect(17, 31, 7, 8);
    map[17][34] = S; map[17][35] = S;

    // ── MARKET SQUARE ──
    fillRect(13, 18, 4, 12, D);

    // ── BARRACKS ──
    fillRect(17, 19, 7, 6, S);
    wallRect(17, 19, 7, 6);
    map[17][21] = S; map[17][22] = S;

    // ── WAR ROOM (mission) ──
    fillRect(17, 26, 7, 5, S);
    wallRect(17, 26, 7, 5);
    map[17][28] = S;

    // ── Corridors ──
    fillRect(12, 9, 1, 31, S);
    fillRect(12, 13, 6, 2, S);
    fillRect(12, 34, 6, 2, S);
    fillRect(17, 23, 1, 3, S);

    // ── MAIN GATE ──
    map[27][22] = D; map[27][23] = D; map[27][24] = D; map[27][25] = D;
    fillRect(26, 20, 3, 2, TW);
    fillRect(26, 26, 3, 2, TW);

    // ── Outer areas ──
    fillRect(28, 22, 4, 4, D);
    fillRect(10, 1, 10, 6, G);
    fillRect(10, 41, 10, 6, G);
    fillRect(12, 42, 6, 4, D);

    // ── MOAT ──
    fillRect(2, 10, 2, 28, WA);
    fillRect(28, 10, 2, 28, WA);
    fillRect(4, 6, 24, 2, WA);
    fillRect(4, 40, 24, 2, WA);
    map[28][22] = D; map[28][23] = D; map[28][24] = D; map[28][25] = D;
    map[29][22] = D; map[29][23] = D; map[29][24] = D; map[29][25] = D;

    // ── South village ──
    fillRect(32, 10, 6, 28, G);
    fillRect(32, 22, 6, 4, D);

    return map;
  }

  var ZONE_RECTS = {
    castle:   { r: 5, c: 18, h: 8, w: 12 },
    forge:    { r: 5, c: 9,  h: 7, w: 8 },
    library:  { r: 5, c: 31, h: 7, w: 8 },
    tavern:   { r: 17, c: 9, h: 7, w: 9 },
    chapel:   { r: 17, c: 31, h: 7, w: 8 },
    market:   { r: 13, c: 18, h: 4, w: 12 },
    barracks: { r: 17, c: 19, h: 7, w: 6 },
    mission:  { r: 17, c: 26, h: 7, w: 5 },
    graveyard:{ r: 10, c: 41, h: 10, w: 6 },
    garden:   { r: 10, c: 1,  h: 10, w: 6 }
  };

  function getZoneCenter(zoneName) {
    var z = ZONE_RECTS[zoneName];
    if (!z) return { col: 24, row: 15 };
    return { col: Math.floor(z.c + z.w / 2), row: Math.floor(z.r + z.h / 2) };
  }

  function getZoneAt(row, col) {
    for (var name in ZONE_RECTS) {
      var z = ZONE_RECTS[name];
      if (row >= z.r && row < z.r + z.h && col >= z.c && col < z.c + z.w) {
        return name;
      }
    }
    return null;
  }

  function getFurniture() {
    return [
      { type: 'throne', row: 7, col: 23 },
      { type: 'banner', row: 6, col: 19, height: 2 },
      { type: 'banner', row: 6, col: 28, height: 2 },
      { type: 'torch',  row: 6, col: 21 },
      { type: 'torch',  row: 6, col: 26 },
      { type: 'anvil',    row: 7, col: 12 },
      { type: 'cauldron', row: 7, col: 14 },
      { type: 'barrel',   row: 9, col: 10 },
      { type: 'torch',    row: 6, col: 10 },
      { type: 'bookcase', row: 6, col: 32, width: 2 },
      { type: 'bookcase', row: 6, col: 36, width: 2 },
      { type: 'table',    row: 9, col: 33, width: 2 },
      { type: 'torch',    row: 6, col: 34 },
      { type: 'table',  row: 19, col: 11, width: 2 },
      { type: 'table',  row: 21, col: 11, width: 2 },
      { type: 'barrel', row: 19, col: 15 },
      { type: 'barrel', row: 20, col: 15 },
      { type: 'barrel', row: 21, col: 15 },
      { type: 'torch',  row: 18, col: 10 },
      { type: 'torch',  row: 18, col: 32 },
      { type: 'torch',  row: 18, col: 37 },
      { type: 'banner', row: 18, col: 34, height: 2 },
      { type: 'bed',   row: 19, col: 20, width: 2 },
      { type: 'bed',   row: 21, col: 20, width: 2 },
      { type: 'dummy', row: 20, col: 23 },
      { type: 'table', row: 19, col: 27, width: 2 },
      { type: 'torch', row: 18, col: 27 },
      { type: 'grave', row: 13, col: 43 },
      { type: 'grave', row: 14, col: 42 },
      { type: 'grave', row: 15, col: 44 },
      { type: 'grave', row: 16, col: 43 },
      { type: 'well', row: 14, col: 3 },
      { type: 'barrel', row: 14, col: 20 },
      { type: 'barrel', row: 14, col: 27 },
      { type: 'table',  row: 14, col: 23, width: 2 }
    ];
  }

  window.MedMap = {
    COLS: COLS,
    ROWS: ROWS,
    generate: generateMap,
    ZONE_RECTS: ZONE_RECTS,
    getZoneCenter: getZoneCenter,
    getZoneAt: getZoneAt,
    getFurniture: getFurniture
  };
})();
