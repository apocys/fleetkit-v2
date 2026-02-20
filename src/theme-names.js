/**
 * SpawnKit v2 — Theme-Specific Agent Names & Roles
 * 
 * Each theme has its own universe-consistent naming.
 * The data bridge uses canonical IDs (hunter, forge, echo, atlas, sentinel).
 * Themes override display names via this mapping.
 */

window.SpawnKitNames = {
  // ── PIXEL: Retro RPG Universe ─────────────────────────
  gameboy: {
    hunter:   { name: 'TRADER',    role: 'Revenue Trainer',  emoji: '💰', title: 'Lv.42 TRADER' },
    forge:    { name: 'HACKER',    role: 'Code Master',      emoji: '⚡', title: 'Lv.99 HACKER' },
    echo:     { name: 'BARD',      role: 'Story Weaver',     emoji: '🎵', title: 'Lv.38 BARD' },
    atlas:    { name: 'SCRIBE',    role: 'Lore Keeper',      emoji: '📜', title: 'Lv.45 SCRIBE' },
    sentinel: { name: 'WATCHER',   role: 'Gate Guardian',    emoji: '👁️', title: 'Lv.50 WATCHER' },
    ceo:      { name: 'TRAINER',   role: 'Gym Leader',       emoji: '🎮', title: 'TRAINER RED' },
    subagent: { prefix: 'ROOKIE',  variants: ['ROOKIE', 'YOUNGSTER', 'BUG CATCHER', 'LASS', 'PICNICKER', 'HIKER'] },
    objects: {
      whiteboard: 'QUEST BOARD',
      mailbox: 'POKÉ MAIL',
      phone: 'POKÉGEAR',
      coffee: 'POTION STATION',
      door: 'TALL GRASS',
      cabinet: 'PC STORAGE'
    }
  },

  // ── PIXEL COLOR: Same as Pixel but colorful ─────────────────────────
  'gameboy-color': {
    hunter:   { name: 'TRADER',    role: 'Revenue Trainer',  emoji: '💰', title: 'Lv.42 TRADER' },
    forge:    { name: 'HACKER',    role: 'Code Master',      emoji: '⚡', title: 'Lv.99 HACKER' },
    echo:     { name: 'BARD',      role: 'Story Weaver',     emoji: '🎵', title: 'Lv.38 BARD' },
    atlas:    { name: 'SCRIBE',    role: 'Lore Keeper',      emoji: '📜', title: 'Lv.45 SCRIBE' },
    sentinel: { name: 'WATCHER',   role: 'Gate Guardian',    emoji: '👁️', title: 'Lv.50 WATCHER' },
    ceo:      { name: 'TRAINER',   role: 'Gym Leader',       emoji: '🎮', title: 'TRAINER RED' },
    subagent: { prefix: 'ROOKIE',  variants: ['ROOKIE', 'YOUNGSTER', 'BUG CATCHER', 'LASS', 'PICNICKER', 'HIKER'] },
    objects: {
      whiteboard: 'QUEST BOARD',
      mailbox: 'POKÉ MAIL',
      phone: 'POKÉGEAR',
      coffee: 'POTION STATION',
      door: 'TALL GRASS',
      cabinet: 'PC STORAGE'
    }
  },

  // ── SIMS: The Sims 1 Office Universe ───────────────────────
  sims: {
    hunter:   { name: 'Hunter',    role: 'Revenue Sim',     emoji: '💰', title: 'Hunter Wells' },
    forge:    { name: 'Forge',     role: 'Tech Sim',        emoji: '🔧', title: 'Forge Park' },
    echo:     { name: 'Echo',      role: 'Creative Sim',    emoji: '🎨', title: 'Echo Chen' },
    atlas:    { name: 'Atlas',     role: 'Ops Sim',         emoji: '📊', title: 'Atlas Lewis' },
    sentinel: { name: 'Sentinel',  role: 'Guard Sim',       emoji: '🛡️', title: 'Sentinel Reed' },
    ceo:      { name: 'Kira',      role: 'Head Sim',        emoji: '👑', title: 'Kira Kane' },
    subagent: { prefix: 'Intern',  variants: ['Intern', 'Newbie', 'Townie', 'NPC', 'Roommate', 'Visitor'] },
    objects: {
      whiteboard: 'Task Board',
      mailbox: 'Sim Mail',
      phone: 'Sim Phone',
      coffee: 'Espresso Machine',
      door: 'Office Door',
      cabinet: 'File Cabinet'
    }
  },

  // ── Resolve display name from canonical ID ────────────────────
  resolve(theme, canonicalId, field) {
    const t = this[theme];
    if (!t || !t[canonicalId]) return canonicalId;
    return field ? t[canonicalId][field] : t[canonicalId].name;
  },

  resolveObject(theme, objectId) {
    const t = this[theme];
    return t?.objects?.[objectId] || objectId;
  },

  getSubAgentName(theme, index) {
    const t = this[theme];
    if (!t?.subagent) return `Sub-Agent #${index + 1}`;
    const variants = t.subagent.variants;
    return `${variants[index % variants.length]} #${Math.floor(index / variants.length) + 1}`;
  },

  // ── Model Identity Integration ──────────────────────────────────────────
  resolveWithModel(theme, canonicalId, modelId, field) {
    const baseName = this.resolve(theme, canonicalId, field);
    
    // If ModelIdentity is available, format with model level
    if (typeof ModelIdentity !== 'undefined' && modelId) {
      return ModelIdentity.formatDisplayName(theme, baseName, modelId);
    }
    
    return baseName;
  }
};