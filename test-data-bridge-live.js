#!/usr/bin/env node
/**
 * SpawnKit Data Bridge Live Mode Test
 * 
 * Tests the data-bridge.js polling functionality and event emission.
 * Run this to verify that live data polling works correctly.
 */

const path = require('path');
const fs = require('fs');

// Mock window object first
global.window = {};

// Mock Electron IPC API for testing
global.window = {
    spawnkitAPI: {
        isAvailable: async () => {
            console.log('🔍 Mock: Checking OpenClaw availability...');
            return true;
        },
        getAll: async () => {
            console.log('📡 Mock: Fetching all data...');
            // Simulate real OpenClaw data structure
            return {
                agents: [
                    {
                        id: 'kira',
                        name: 'ApoMac',
                        role: 'CEO',
                        status: 'active',
                        currentTask: 'Testing SpawnKit data bridge',
                        emoji: '👑',
                        lastSeen: new Date().toISOString(),
                        lastSeenRelative: '30s ago',
                        tokensUsed: 12500,
                        apiCalls: 45,
                        modelUsed: 'claude-opus-4-6'
                    },
                    {
                        id: 'forge',
                        name: 'Forge',
                        role: 'CTO',
                        status: Math.random() > 0.5 ? 'building' : 'idle', // Random status change
                        currentTask: 'Data bridge integration',
                        emoji: '🔨',
                        lastSeen: new Date(Date.now() - 60000).toISOString(),
                        lastSeenRelative: '1m ago',
                        tokensUsed: 15600,
                        apiCalls: 67,
                        modelUsed: 'claude-opus-4-6'
                    }
                ],
                subagents: Math.random() > 0.7 ? [
                    {
                        id: 'sa-test-' + Date.now(),
                        name: 'Test Runner',
                        parentAgent: 'forge',
                        task: 'Running live mode tests',
                        status: 'running',
                        progress: 0.5,
                        startTime: new Date().toISOString(),
                        label: 'forge-test-runner'
                    }
                ] : [],
                crons: [
                    {
                        id: 'test-cron',
                        name: 'Test Cron Job',
                        enabled: true,
                        schedule: '*/30 * * * * *',
                        nextRun: Date.now() + 30000,
                        lastRun: Date.now() - 30000,
                        lastStatus: 'success',
                        owner: 'kira'
                    }
                ],
                metrics: {
                    tokensToday: 54900 + Math.floor(Math.random() * 100),
                    apiCallsToday: 187 + Math.floor(Math.random() * 10),
                    activeSessions: 2,
                    uptime: '14h 32m',
                    memoryUsage: 0.45,
                    activeAgents: 2
                },
                events: [],
                memory: {
                    longTerm: {
                        content: 'Test memory content',
                        size: 1024,
                        lastModified: Date.now()
                    },
                    daily: [],
                    heartbeat: null
                }
            };
        }
    }
};

// Mock document for initialization
global.document = {
    readyState: 'complete',
    addEventListener: () => {},
    getElementById: () => null,
    createElement: () => ({
        style: { cssText: '' },
        addEventListener: () => {},
        remove: () => {}
    }),
    body: {
        appendChild: () => {}
    }
};

// Load the data-bridge.js
require('./electron/src/data-bridge.js');

console.log('🧪 SpawnKit Data Bridge Live Mode Test');
console.log('=====================================');

// Test event listeners
let eventCount = 0;
SpawnKit.on('data:refresh', (data) => {
    eventCount++;
    console.log(`📊 Event ${eventCount}: data:refresh - ${data.agents.length} agents, ${data.subagents.length} subagents`);
    
    // Log agent statuses
    data.agents.forEach(agent => {
        console.log(`   👤 ${agent.name} (${agent.id}): ${agent.status} - ${agent.currentTask}`);
    });
    
    // Log subagents
    if (data.subagents.length > 0) {
        data.subagents.forEach(sa => {
            console.log(`   🤖 ${sa.name} (${sa.id}): ${sa.status} - ${sa.task}`);
        });
    }
});

SpawnKit.on('agent:status', (data) => {
    console.log(`🔄 Event: agent:status - ${data.name} changed from ${data.oldStatus} to ${data.newStatus}`);
});

SpawnKit.on('subagent:spawn', (data) => {
    console.log(`🚀 Event: subagent:spawn - ${data.name} spawned under ${data.parentAgent}`);
});

SpawnKit.on('live:started', (data) => {
    console.log(`⏰ Live updates started - interval: ${data.interval}ms, mode: ${data.mode}`);
});

// Wait for initialization
setTimeout(() => {
    console.log('\n📊 SpawnKit Status:');
    console.log(`   Mode: ${SpawnKit.mode}`);
    console.log(`   Agents: ${SpawnKit.data.agents.length}`);
    console.log(`   Subagents: ${SpawnKit.data.subagents.length}`);
    console.log(`   Live updates: ${SpawnKit.api.getDebugInfo().liveUpdateActive ? 'Active' : 'Inactive'}`);
    
    console.log('\n🎯 Testing manual refresh...');
    SpawnKit.refresh().then(() => {
        console.log('✅ Manual refresh completed');
        
        // Test for 2 minutes then stop
        setTimeout(() => {
            console.log('\n⏹️  Stopping live updates...');
            SpawnKit.stopLive();
            
            const debug = SpawnKit.api.getDebugInfo();
            console.log('\n📈 Final Stats:');
            console.log(`   Refresh count: ${debug.refreshCount}`);
            console.log(`   Failure count: ${debug.failureCount}`);
            console.log(`   Events processed: ${eventCount}`);
            console.log(`   Data size: ${debug.dataSize} bytes`);
            
            console.log('\n✅ Test completed successfully!');
            process.exit(0);
        }, 120000); // 2 minutes
    });
}, 2000);

console.log('\n🔄 Running for 2 minutes to test live updates...');
console.log('   Watch for data:refresh events every 30 seconds');
console.log('   Agent status changes should trigger agent:status events');
console.log('   New subagents should trigger subagent:spawn events');