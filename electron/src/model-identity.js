/**
 * SpawnKit v2 — Model Identity System
 * 
 * Visual distinction for AI models across all themes.
 * Each model gets a unique color, symbol, and tier level.
 * 
 * MINIMAL & EXTENSIBLE:
 * - Ships with 3 Claude models
 * - Users can register new models via ModelIdentity.register()
 * - CSS custom properties for theme integration
 * - Works with existing naming system
 */

class ModelIdentity {
  // Core model registry - the source of truth
  static MODELS = {
    'claude-opus-4-6': {
      tier: 'premium',
      color: '#FF6B6B',    // Rich red - premium/powerful
      symbol: '◆',         // Diamond - precious
      level: 'MAX',
      name: 'Opus'
    },
    'claude-sonnet-4': {
      tier: 'standard',
      color: '#4ECDC4',    // Teal - balanced/reliable  
      symbol: '●',         // Circle - complete/stable
      level: 'PRO',
      name: 'Sonnet'
    },
    'claude-haiku-4-5': {
      tier: 'light',
      color: '#45B7D1',    // Light blue - fast/efficient
      symbol: '▲',         // Triangle - sharp/quick
      level: 'LITE', 
      name: 'Haiku'
    }
  };

  /**
   * Register a new model identity
   * @param {string} modelId - Model identifier (e.g., 'gpt-4-turbo')
   * @param {object} identity - Visual identity config
   */
  static register(modelId, identity) {
    if (!identity.tier || !identity.color || !identity.symbol || !identity.level) {
      throw new Error('Model identity must have: tier, color, symbol, level');
    }
    
    this.MODELS[modelId] = {
      tier: identity.tier,
      color: identity.color,
      symbol: identity.symbol,
      level: identity.level,
      name: identity.name || this._extractModelName(modelId)
    };
    
    // Update CSS variables if DOM is ready
    if (typeof document !== 'undefined') {
      this._updateCSSVariables();
    }
  }

  /**
   * Get identity for a model
   * @param {string} modelId - Model identifier
   * @returns {object} Identity object or fallback
   */
  static getIdentity(modelId) {
    return this.MODELS[modelId] || {
      tier: 'unknown',
      color: '#8E8E93',    // Neutral gray
      symbol: '?',
      level: '???',
      name: this._extractModelName(modelId)
    };
  }

  /**
   * Get CSS custom properties for a model
   * @param {string} modelId - Model identifier
   * @returns {object} CSS variables object
   */
  static getCSSVariables(modelId) {
    const identity = this.getIdentity(modelId);
    return {
      '--model-color': identity.color,
      '--model-symbol': `"${identity.symbol}"`,
      '--model-level': `"${identity.level}"`,
      '--model-tier': identity.tier,
      '--model-name': `"${identity.name}"`
    };
  }

  /**
   * Apply model identity to DOM element
   * @param {HTMLElement} element - Target element
   * @param {string} modelId - Model identifier
   */
  static applyToElement(element, modelId) {
    if (!element) return;
    
    const vars = this.getCSSVariables(modelId);
    Object.entries(vars).forEach(([prop, value]) => {
      element.style.setProperty(prop, value);
    });
    
    // Add tier class for theme-specific styling
    const identity = this.getIdentity(modelId);
    element.classList.add(`model-tier-${identity.tier}`);
  }

  /**
   * Get all registered model IDs
   * @returns {string[]} Array of model identifiers
   */
  static getRegisteredModels() {
    return Object.keys(this.MODELS);
  }

  /**
   * Get tier-based sizing for themes
   * @param {string} modelId - Model identifier  
   * @returns {object} Size config for different themes
   */
  static getSizing(modelId) {
    const identity = this.getIdentity(modelId);
    
    switch (identity.tier) {
      case 'premium':
        return { gameboy: 32, executive: 'large', sims: 'xl' };
      case 'standard':
        return { gameboy: 24, executive: 'medium', sims: 'large' };
      case 'light':
        return { gameboy: 16, executive: 'small', sims: 'medium' };
      default:
        return { gameboy: 20, executive: 'medium', sims: 'medium' };
    }
  }

  /**
   * Theme-aware display name formatter
   * @param {string} theme - Theme identifier
   * @param {string} agentName - Agent display name
   * @param {string} modelId - Model identifier
   * @returns {string} Formatted display name
   */
  static formatDisplayName(theme, agentName, modelId) {
    const identity = this.getIdentity(modelId);
    
    switch (theme) {
      case 'gameboy':
      case 'gameboy-color':
        return `${agentName} [${identity.level}]`;
        
      case 'sims':
        return `${agentName} [${identity.level}]`;
        
      case 'executive':
      default:
        return `${agentName} (${identity.level})`;
    }
  }

  // ── Private Methods ────────────────────────────────────────

  /**
   * Extract readable name from model ID
   * @private
   */
  static _extractModelName(modelId) {
    return modelId
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s+\d.*$/, ''); // Remove version numbers
  }

  /**
   * Update global CSS variables for all models
   * @private  
   */
  static _updateCSSVariables() {
    const root = document.documentElement;
    
    Object.entries(this.MODELS).forEach(([modelId, identity]) => {
      const prefix = `--model-${modelId.replace(/[^a-z0-9]/gi, '-')}`;
      root.style.setProperty(`${prefix}-color`, identity.color);
      root.style.setProperty(`${prefix}-symbol`, `"${identity.symbol}"`);
      root.style.setProperty(`${prefix}-level`, `"${identity.level}"`);
      root.style.setProperty(`${prefix}-name`, `"${identity.name}"`);
    });
  }
}

// Auto-initialize CSS variables when DOM loads
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ModelIdentity._updateCSSVariables();
    });
  } else {
    ModelIdentity._updateCSSVariables();
  }
}

// Export for Node.js and browsers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModelIdentity;
} else if (typeof window !== 'undefined') {
  window.ModelIdentity = ModelIdentity;
}