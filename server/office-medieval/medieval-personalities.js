/**
 * medieval-personalities.js — Agent personality system
 * Ported from medieval-agent-lifecycle.js. Moods, routines, zone preferences.
 */
(function () {
  'use strict';
  var MT = window.MedTypes;

  var PERSONALITIES = {
    Sycopa: {
      title: 'Royal Commander', temperament: 'stoic', moodBase: 0.75,
      preferredZones: ['castle', 'mission', 'tavern'], avoidZones: ['graveyard'],
      routines: {
        dawn: { zone: 'castle', emoji: '☀️' }, morning: { zone: 'mission', emoji: '⚔️' },
        midday: { zone: 'tavern', emoji: '🍺' }, afternoon: { zone: 'castle', emoji: '📜' },
        dusk: { zone: 'castle', emoji: '🌅' }, night: { zone: 'castle', emoji: '👑' }
      },
      walkSpeedMod: { day: 1.0, night: 0.6 }
    },
    Forge: {
      title: 'Master Smith', temperament: 'intense', moodBase: 0.65,
      preferredZones: ['forge', 'market'], avoidZones: ['chapel', 'library'],
      routines: {
        dawn: { zone: 'forge', emoji: '🔨' }, morning: { zone: 'forge', emoji: '🔥' },
        midday: { zone: 'market', emoji: '💰' }, afternoon: { zone: 'forge', emoji: '⚒️' },
        dusk: { zone: 'tavern', emoji: '🍖' }, night: { zone: 'forge', emoji: '🌙' }
      },
      walkSpeedMod: { day: 1.3, night: 0.8 }
    },
    Atlas: {
      title: 'Royal Scribe', temperament: 'methodical', moodBase: 0.70,
      preferredZones: ['library', 'castle', 'chapel'], avoidZones: ['forge'],
      routines: {
        dawn: { zone: 'chapel', emoji: '🙏' }, morning: { zone: 'library', emoji: '📖' },
        midday: { zone: 'castle', emoji: '📜' }, afternoon: { zone: 'library', emoji: '🪶' },
        dusk: { zone: 'library', emoji: '📚' }, night: { zone: 'chapel', emoji: '🕯️' }
      },
      walkSpeedMod: { day: 0.9, night: 0.7 }
    },
    Hunter: {
      title: 'Scout Captain', temperament: 'restless', moodBase: 0.60,
      preferredZones: ['barracks', 'garden', 'market'], avoidZones: ['library'],
      routines: {
        dawn: { zone: 'garden', emoji: '🌄' }, morning: { zone: 'barracks', emoji: '🏹' },
        midday: { zone: 'market', emoji: '🎯' }, afternoon: { zone: 'garden', emoji: '🌿' },
        dusk: { zone: 'tavern', emoji: '🍺' }, night: { zone: 'barracks', emoji: '🗡️' }
      },
      walkSpeedMod: { day: 1.4, night: 1.0 }
    },
    Echo: {
      title: 'Court Herald', temperament: 'cheerful', moodBase: 0.80,
      preferredZones: ['castle', 'tavern', 'market'], avoidZones: ['graveyard'],
      routines: {
        dawn: { zone: 'castle', emoji: '📯' }, morning: { zone: 'market', emoji: '📢' },
        midday: { zone: 'tavern', emoji: '🎵' }, afternoon: { zone: 'castle', emoji: '📜' },
        dusk: { zone: 'tavern', emoji: '🎶' }, night: { zone: 'castle', emoji: '🌙' }
      },
      walkSpeedMod: { day: 1.1, night: 0.8 }
    },
    Sentinel: {
      title: 'Castle Guard', temperament: 'vigilant', moodBase: 0.55,
      preferredZones: ['barracks', 'castle', 'graveyard'], avoidZones: ['tavern'],
      routines: {
        dawn: { zone: 'barracks', emoji: '🛡️' }, morning: { zone: 'castle', emoji: '⚔️' },
        midday: { zone: 'barracks', emoji: '🗡️' }, afternoon: { zone: 'castle', emoji: '👁️' },
        dusk: { zone: 'graveyard', emoji: '☠️' }, night: { zone: 'castle', emoji: '🔦' }
      },
      walkSpeedMod: { day: 0.9, night: 1.2 }
    }
  };

  /** Get personality for an agent name, or generate a knight-templar one */
  function getPersonality(name) {
    if (PERSONALITIES[name]) return PERSONALITIES[name];
    // Auto-generate for unknown agents
    var titles = ['Knight Errant', 'Wandering Sage', 'Sworn Blade', 'Temple Warden', 'Hedge Wizard'];
    return {
      title: titles[Math.abs(hashStr(name)) % titles.length],
      temperament: 'balanced', moodBase: 0.65,
      preferredZones: ['castle', 'barracks'], avoidZones: [],
      routines: {
        dawn: { zone: 'barracks', emoji: '⚔️' }, morning: { zone: 'castle', emoji: '🏰' },
        midday: { zone: 'tavern', emoji: '🍺' }, afternoon: { zone: 'castle', emoji: '📜' },
        dusk: { zone: 'tavern', emoji: '🌅' }, night: { zone: 'barracks', emoji: '🌙' }
      },
      walkSpeedMod: { day: 1.0, night: 0.8 }
    };
  }

  /** Get current emoji for agent based on time of day */
  function getTimeEmoji(name, cycleProgress) {
    var p = getPersonality(name);
    var tod = MT.getTimeOfDay(cycleProgress);
    var routine = p.routines[tod];
    return routine ? routine.emoji : '🏰';
  }

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return h;
  }

  window.MedPersonalities = {
    PERSONALITIES: PERSONALITIES,
    get: getPersonality,
    getTimeEmoji: getTimeEmoji
  };
})();
