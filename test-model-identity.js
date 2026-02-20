#!/usr/bin/env node

// Simple test of the Model Identity system
const ModelIdentity = require('./src/model-identity.js');

console.log('🧪 Testing Model Identity System\n');

// Test 1: Basic model retrieval
console.log('1. Getting built-in model identities:');
const models = ModelIdentity.getRegisteredModels();
models.forEach(modelId => {
  const identity = ModelIdentity.getIdentity(modelId);
  console.log(`   ${modelId}: ${identity.symbol} ${identity.name} (${identity.level}) - ${identity.color}`);
});

console.log('\n2. Testing CSS variable generation:');
const opusVars = ModelIdentity.getCSSVariables('claude-opus-4-6');
Object.entries(opusVars).forEach(([key, value]) => {
  console.log(`   ${key}: ${value}`);
});

console.log('\n3. Testing model registration:');
ModelIdentity.register('gpt-4-turbo', {
  tier: 'standard',
  color: '#10A37F',
  symbol: '⚡',
  level: 'TURBO',
  name: 'GPT-4'
});

const gptIdentity = ModelIdentity.getIdentity('gpt-4-turbo');
console.log(`   Registered: ${gptIdentity.symbol} ${gptIdentity.name} (${gptIdentity.level}) - ${gptIdentity.color}`);

console.log('\n4. Testing theme formatting:');
const themes = ['executive', 'gameboy', 'sims'];
themes.forEach(theme => {
  const formatted = ModelIdentity.formatDisplayName(theme, 'Forge', 'claude-opus-4-6');
  console.log(`   ${theme}: "${formatted}"`);
});

console.log('\n5. Testing sizing:');
models.forEach(modelId => {
  const sizing = ModelIdentity.getSizing(modelId);
  console.log(`   ${modelId}: GameBoy ${sizing.gameboy}px, Executive ${sizing.executive}, Sims ${sizing.sims}`);
});

console.log('\n6. Testing fallback for unknown model:');
const unknown = ModelIdentity.getIdentity('unknown-model-123');
console.log(`   Unknown model: ${unknown.symbol} ${unknown.name} (${unknown.level}) - ${unknown.color}`);

console.log('\n✅ All tests completed!');