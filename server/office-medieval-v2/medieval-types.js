/**
 * medieval-types.js — Medieval-specific constants, tile types, zones, palettes
 * Defines base OfficeTypes + extends with castle theme.
 */
(function () {
  'use strict';

  // ── Base office types (needed by renderer) ──
  var TILE_SIZE = 20;
  window.OfficeTypes = window.OfficeTypes || {};
  window.OfficeTypes.TILE_SIZE = TILE_SIZE;
  window.OfficeTypes.Direction = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
  window.OfficeTypes.CharacterState = { IDLE: 0, WALK: 1, WORK: 2 };

  // ── Medieval tile types (extend base) ──
  var MedTileType = {
    FLOOR_STONE: 0,    // Standard stone floor
    WALL_CASTLE: 1,    // Castle wall
    VOID: 2,           // Empty space
    FLOOR_WOOD: 3,     // Wooden planks (tavern, library)
    FLOOR_DIRT: 4,     // Dirt path (courtyard)
    FLOOR_GRASS: 5,    // Grass (gardens)
    FLOOR_WATER: 6,    // Water (moat, well)
    WALL_TOWER: 7      // Tower wall (thick)
  };

  // ── Castle zones ──
  var ZONES = {
    castle:   { name: 'Throne Room',   color: '#c9a959', emoji: '👑' },
    forge:    { name: 'The Forge',     color: '#ff6b35', emoji: '🔥' },
    library:  { name: 'The Library',   color: '#6b8cce', emoji: '📚' },
    tavern:   { name: 'The Tavern',    color: '#8b6914', emoji: '🍺' },
    market:   { name: 'Market Square', color: '#2d8f4e', emoji: '💰' },
    chapel:   { name: 'The Chapel',    color: '#e8d5b7', emoji: '🕯️' },
    barracks: { name: 'Barracks',      color: '#7a7a7a', emoji: '⚔️' },
    graveyard:{ name: 'Graveyard',     color: '#4a4a5e', emoji: '⚰️' },
    garden:   { name: 'Gardens',       color: '#4a9e4a', emoji: '🌿' },
    mission:  { name: 'War Room',      color: '#8b0000', emoji: '🗺️' }
  };

  // ── Medieval character palettes (armor/robe colors) ──
  var MED_PALETTES = [
    { skin: '#f4c794', armor: '#8b7355', cloak: '#c9a959', hair: '#3d2b1f' }, // Royal gold
    { skin: '#d4a574', armor: '#555555', cloak: '#b22222', hair: '#1a1a2e' }, // Dark knight
    { skin: '#f0d5a8', armor: '#4a6b8a', cloak: '#6b8cce', hair: '#8b6914' }, // Scholar blue
    { skin: '#c68642', armor: '#2d5a27', cloak: '#4a9e4a', hair: '#0d0d0d' }, // Ranger green
    { skin: '#ffe0bd', armor: '#8b4513', cloak: '#e67e22', hair: '#b5651d' }, // Smith brown
    { skin: '#a0785a', armor: '#663399', cloak: '#9b59b6', hair: '#2c2c2c' }  // Mystic purple
  ];

  // ── Day/Night cycle timing ──
  var DAY_NIGHT = {
    cycleDuration: 60 * 60,  // 60 min full cycle
    dayRatio: 0.7,           // 70% day, 30% night
    dawnColor: 'rgba(255, 200, 100, 0.08)',
    dayColor: 'rgba(0, 0, 0, 0)',
    duskColor: 'rgba(200, 100, 50, 0.12)',
    nightColor: 'rgba(20, 20, 60, 0.35)'
  };

  // ── Furniture types ──
  var MED_FURNITURE = {
    throne:   { emoji: '👑', width: 2, height: 2 },
    anvil:    { emoji: '⚒️', width: 1, height: 1 },
    cauldron: { emoji: '🪣', width: 1, height: 1 },
    bookcase: { emoji: '📚', width: 2, height: 1 },
    barrel:   { emoji: '🛢️', width: 1, height: 1 },
    table:    { emoji: '🪑', width: 2, height: 1 },
    torch:    { emoji: '🔥', width: 1, height: 1 },
    grave:    { emoji: '⚰️', width: 1, height: 1 },
    well:     { emoji: '🪣', width: 1, height: 1 },
    banner:   { emoji: '🏴', width: 1, height: 2 },
    dummy:    { emoji: '🎯', width: 1, height: 1 },
    bed:      { emoji: '🛏️', width: 2, height: 1 }
  };

  // ── Time of day ──
  function getTimeOfDay(cycleProgress) {
    if (cycleProgress < 0.1) return 'dawn';
    if (cycleProgress < 0.35) return 'morning';
    if (cycleProgress < 0.5) return 'midday';
    if (cycleProgress < 0.65) return 'afternoon';
    if (cycleProgress < 0.75) return 'dusk';
    return 'night';
  }

  window.MedTypes = {
    MedTileType: MedTileType,
    ZONES: ZONES,
    MED_PALETTES: MED_PALETTES,
    DAY_NIGHT: DAY_NIGHT,
    MED_FURNITURE: MED_FURNITURE,
    getTimeOfDay: getTimeOfDay
  };
})();
