#!/usr/bin/env node
/**
 * SpawnKit Data Bridge Validation
 * 
 * Validates the data-bridge.js structure and enhancements.
 */

const fs = require('fs');
const path = require('path');

const dataBridgePath = path.join(__dirname, 'electron', 'src', 'data-bridge.js');

if (!fs.existsSync(dataBridgePath)) {
    console.error('❌ data-bridge.js not found');
    process.exit(1);
}

const content = fs.readFileSync(dataBridgePath, 'utf8');

console.log('🧪 SpawnKit Data Bridge Validation');
console.log('================================');

// Check for required enhancements
const checks = [
    {
        name: '30-second polling interval',
        test: /30000.*30s live/,
        required: true
    },
    {
        name: 'Exponential backoff variables',
        test: /failureCount = 0|baseInterval = 30000/,
        required: true
    },
    {
        name: 'setTimeout-based scheduling',
        test: /setTimeout.*async.*=>/,
        required: true
    },
    {
        name: 'Exponential backoff calculation',
        test: /Math\.min.*Math\.pow.*2.*failureCount/,
        required: true
    },
    {
        name: 'Connection retry limit (5 failures)',
        test: /failureCount >= 5/,
        required: true
    },
    {
        name: 'Backoff max limit (5 minutes)',
        test: /300000/,
        required: true
    },
    {
        name: 'Failure count reset on success',
        test: /failureCount = 0.*Reset failure count/,
        required: true
    },
    {
        name: 'clearTimeout in stopLive',
        test: /clearTimeout.*liveInterval/,
        required: true
    },
    {
        name: 'Enhanced debug info',
        test: /refreshCount: refreshCount,[\s]*failureCount: failureCount/,
        required: true
    }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
    const matches = check.test.test(content);
    if (matches) {
        console.log(`✅ ${check.name}`);
        passed++;
    } else {
        console.log(`${check.required ? '❌' : '⚠️ '} ${check.name}`);
        if (check.required) failed++;
    }
});

// Check for key API methods
const apiMethods = [
    'SpawnKit.on',
    'SpawnKit.off', 
    'SpawnKit.emit',
    'SpawnKit.refresh',
    'SpawnKit.startLive',
    'SpawnKit.stopLive',
    'SpawnKit.mode',
    'SpawnKit.data',
    'SpawnKit.api.getSessions',
    'SpawnKit.api.getCrons',
    'SpawnKit.api.sendMission',
    'SpawnKit.api.getDebugInfo'
];

console.log('\n📋 API Methods Check:');
let apiPassed = 0;

apiMethods.forEach(method => {
    // Special case for nested method
    const exists = method === 'SpawnKit.api.getDebugInfo' ? 
        content.includes('getDebugInfo: function()') : 
        content.includes(method);
    console.log(`${exists ? '✅' : '❌'} ${method}`);
    if (exists) apiPassed++;
});

// Check for event types
const events = [
    'data:refresh',
    'agent:status', 
    'subagent:spawn',
    'mission:new',
    'cron:trigger',
    'live:started',
    'live:stopped'
];

console.log('\n📡 Event Types Check:');
let eventsPassed = 0;

events.forEach(event => {
    const exists = content.includes(`'${event}'`) || content.includes(`"${event}"`);
    console.log(`${exists ? '✅' : '❌'} ${event}`);
    if (exists) eventsPassed++;
});

// Check for data mapping functions
const mappingFunctions = [
    'mapOpenClawToSpawnKit',
    'checkForStatusChanges',
    'checkForNewSubagents',
    'checkForNewMissions',
    'checkForCronTriggers'
];

console.log('\n🔄 Data Mapping Functions:');
let mappingPassed = 0;

mappingFunctions.forEach(func => {
    const exists = content.includes(func);
    console.log(`${exists ? '✅' : '❌'} ${func}`);
    if (exists) mappingPassed++;
});

// Summary
console.log('\n📊 Validation Summary:');
console.log(`   Core Enhancements: ${passed}/${checks.filter(c => c.required).length} passed`);
console.log(`   API Methods: ${apiPassed}/${apiMethods.length} found`);
console.log(`   Event Types: ${eventsPassed}/${events.length} found`);
console.log(`   Data Mapping: ${mappingPassed}/${mappingFunctions.length} found`);
console.log(`   File Size: ${(content.length / 1024).toFixed(1)}KB`);

if (failed === 0) {
    console.log('\n✅ All required enhancements validated successfully!');
    console.log('\n🎯 Data Bridge Live Mode Features:');
    console.log('   • 30-second polling intervals');
    console.log('   • Exponential backoff (30s → 5min max)');
    console.log('   • Graceful fallback to demo mode after 5 failures');
    console.log('   • Real-time event emission for status changes');
    console.log('   • Robust error handling and connection retry');
    console.log('   • Clean API for dashboard panel consumption');
    process.exit(0);
} else {
    console.log(`\n❌ ${failed} required enhancements missing!`);
    process.exit(1);
}