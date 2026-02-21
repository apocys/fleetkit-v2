# Model Identity Integration Guide

The Model Identity system provides visual distinction for AI models across all SpawnKit themes.

## Quick Start

1. **Include the script** in your HTML:
```html
<script src="src/model-identity.js"></script>
```

2. **Apply model styling** to agent elements:
```javascript
// Get model identity
const identity = ModelIdentity.getIdentity('claude-opus-4-6');

// Apply to DOM element
ModelIdentity.applyToElement(agentCard, 'claude-opus-4-6');
```

3. **Format display names** with model info:
```javascript
// Theme-aware formatting
const displayName = ModelIdentity.formatDisplayName('gameboy', 'Forge', 'claude-opus-4-6');
// Returns: "Forge [MAX]"
```

## CSS Integration

The system automatically sets CSS custom properties:

```css
.agent-card {
  border-left: 4px solid var(--model-color);
}

.model-badge::before {
  content: var(--model-symbol);
}

.model-badge::after {
  content: var(--model-level);
}
```

## Available Models

- `claude-opus-4-6` → Premium (red diamond, MAX)
- `claude-sonnet-4` → Standard (teal circle, PRO) 
- `claude-haiku-4-5` → Light (blue triangle, LITE)

## Register New Models

```javascript
ModelIdentity.register('gpt-4-turbo', {
  tier: 'standard',
  color: '#10A37F',
  symbol: '⚡', 
  level: 'TURBO',
  name: 'GPT-4'
});
```

## Theme Integration

Each theme renders model identity differently:

- **Executive**: `Agent (LEVEL)` with colored badge
- **GameBoy**: `AGENT [LEVEL]` with size/color variations  
- **Sims**: `Agent Name [LEVEL]` with plumbob coloring

## SpawnKit Data Bridge

The data bridge includes model information:

```javascript
// Agent objects include model field
agent = {
  id: 'forge',
  name: 'Forge', 
  model: 'claude-opus-4-6', // ← Model identity
  // ... other fields
}

// Helper functions
SpawnKit.getModelIdentity(modelId)
SpawnKit.formatAgentDisplay(theme, agent)  
SpawnKit.applyModelStyling(element, modelId)
```

## Testing

Open `test-model-identity.html` to see the system in action.