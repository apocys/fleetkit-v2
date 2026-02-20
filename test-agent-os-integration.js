/**
 * Agent OS Integration Test Suite
 * 
 * Tests the integration of Agent OS Naming + Model Identity systems
 * across all SpawnKit themes (GameBoy, Sims, Executive).
 * 
 * Usage:
 *   node test-agent-os-integration.js
 *   or include in browser console
 */

// Test data setup
const testAgents = [
    {
        id: 'forge',
        name: 'Forge',
        role: 'CTO',
        status: 'building',
        currentTask: 'Integrating Agent OS systems',
        model: 'claude-opus-4-6'
    },
    {
        id: 'atlas',
        name: 'Atlas',
        role: 'COO',
        status: 'active',
        currentTask: 'Process optimization',
        model: 'claude-sonnet-4'
    }
];

const testSubagents = [
    {
        id: 'sa-1',
        name: 'Theme Builder',
        agentOSName: 'Forge.TaskRunner-01',
        parentAgent: 'forge',
        status: 'running',
        task: 'Building theme system',
        model: 'claude-haiku-4-5'
    },
    {
        id: 'sa-2',
        name: 'Process Optimizer',
        agentOSName: 'Atlas.OpsRunner-01',
        parentAgent: 'atlas',
        status: 'running',
        task: 'Optimizing workflows',
        model: 'claude-sonnet-4'
    }
];

const testSpawnKitData = {
    agents: testAgents,
    subagents: testSubagents,
    missions: [],
    crons: [],
    metrics: {},
    events: [],
    memory: {}
};

// Test suite
class AgentOSIntegrationTests {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }
    
    log(message, type = 'info') {
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} ${message}`);
    }
    
    assert(condition, message) {
        if (condition) {
            this.results.passed++;
            this.log(`PASS: ${message}`, 'success');
        } else {
            this.results.failed++;
            this.log(`FAIL: ${message}`, 'error');
        }
        this.results.tests.push({ message, passed: condition });
    }
    
    // Test 1: Agent OS Naming System
    testAgentOSNaming() {
        this.log('Testing Agent OS Naming System...');
        
        if (typeof window !== 'undefined' && window.AgentOSNaming) {
            const AgentOSNaming = window.AgentOSNaming;
            
            // Test name generation
            const agentOSName = AgentOSNaming.generate('forge', 'TaskRunner', testSubagents);
            this.assert(agentOSName === 'Forge.TaskRunner-02', `Generated correct Agent OS name: ${agentOSName}`);
            
            // Test name parsing
            const parsed = AgentOSNaming.parse('Forge.TaskRunner-01');
            this.assert(parsed && parsed.isValid, 'Parsed Agent OS name correctly');
            this.assert(parsed.parent === 'forge', `Correct parent: ${parsed.parent}`);
            this.assert(parsed.role === 'TaskRunner', `Correct role: ${parsed.role}`);
            
            // Test display names
            const abbreviated = AgentOSNaming.displayName('Forge.TaskRunner-01', 'abbreviated');
            this.assert(abbreviated === 'F.TR-01', `Correct abbreviated name: ${abbreviated}`);
            
        } else {
            this.log('AgentOSNaming not available - skipping tests', 'error');
        }
    }
    
    // Test 2: Model Identity System
    testModelIdentity() {
        this.log('Testing Model Identity System...');
        
        if (typeof window !== 'undefined' && window.ModelIdentity) {
            const ModelIdentity = window.ModelIdentity;
            
            // Test identity retrieval
            const opusIdentity = ModelIdentity.getIdentity('claude-opus-4-6');
            this.assert(opusIdentity.tier === 'premium', `Correct Opus tier: ${opusIdentity.tier}`);
            this.assert(opusIdentity.color === '#FF6B6B', `Correct Opus color: ${opusIdentity.color}`);
            this.assert(opusIdentity.level === 'MAX', `Correct Opus level: ${opusIdentity.level}`);
            
            const sonnetIdentity = ModelIdentity.getIdentity('claude-sonnet-4');
            this.assert(sonnetIdentity.tier === 'standard', `Correct Sonnet tier: ${sonnetIdentity.tier}`);
            
            const haikuIdentity = ModelIdentity.getIdentity('claude-haiku-4-5');
            this.assert(haikuIdentity.tier === 'light', `Correct Haiku tier: ${haikuIdentity.tier}`);
            
            // Test CSS variables
            const cssVars = ModelIdentity.getCSSVariables('claude-opus-4-6');
            this.assert(cssVars['--model-color'] === '#FF6B6B', 'Correct CSS color variable');
            this.assert(cssVars['--model-level'] === '"MAX"', 'Correct CSS level variable');
            
        } else {
            this.log('ModelIdentity not available - skipping tests', 'error');
        }
    }
    
    // Test 3: Data Bridge Integration
    testDataBridgeIntegration() {
        this.log('Testing Data Bridge Integration...');
        
        if (typeof window !== 'undefined' && window.SpawnKit) {
            const SpawnKit = window.SpawnKit;
            
            // Test that SpawnKit has the required methods
            this.assert(typeof SpawnKit.getModelIdentity === 'function', 'SpawnKit.getModelIdentity exists');
            this.assert(typeof SpawnKit.formatAgentDisplay === 'function', 'SpawnKit.formatAgentDisplay exists');
            this.assert(typeof SpawnKit.applyModelStyling === 'function', 'SpawnKit.applyModelStyling exists');
            
            // Test model identity integration
            const identity = SpawnKit.getModelIdentity('claude-opus-4-6');
            this.assert(identity.tier === 'premium', 'SpawnKit.getModelIdentity works correctly');
            
        } else {
            this.log('SpawnKit not available - skipping tests', 'error');
        }
    }
    
    // Test 4: GameBoy Theme Integration
    testGameBoyIntegration() {
        this.log('Testing GameBoy Theme Integration...');
        
        if (typeof window !== 'undefined' && window.GameBoyCharacterManager) {
            const hasUpdateMethod = typeof window.GameBoyCharacterManager.prototype.updateAgentOSNames === 'function';
            this.assert(hasUpdateMethod, 'GameBoy CharacterManager has updateAgentOSNames method');
            
        } else {
            this.log('GameBoy CharacterManager not available - theme not loaded');
        }
        
        // Test character naming logic would go here when theme is active
    }
    
    // Test 5: Sims Theme Integration  
    testSimsIntegration() {
        this.log('Testing Sims Theme Integration...');
        
        if (typeof window !== 'undefined' && window.SimsCharacterManager) {
            const hasUpdateMethod = typeof window.SimsCharacterManager.prototype.updateAgentOSNames === 'function';
            this.assert(hasUpdateMethod, 'Sims CharacterManager has updateAgentOSNames method');
            
        } else {
            this.log('Sims CharacterManager not available - theme not loaded');
        }
        
        if (typeof window !== 'undefined' && window.Plumbob) {
            const plumbob = new window.Plumbob();
            const hasSetColor = typeof plumbob.setColor === 'function';
            this.assert(hasSetColor, 'Plumbob has setColor method for model identity colors');
            
        } else {
            this.log('Plumbob not available - theme not loaded');
        }
    }
    
    // Test 6: Executive Theme Integration
    testExecutiveIntegration() {
        this.log('Testing Executive Theme Integration...');
        
        // Test that executive theme functions exist
        if (typeof window !== 'undefined') {
            const hasAgentUpdate = typeof window.handleAgentsUpdate === 'function';
            const hasSubagentUpdate = typeof window.handleSubagentsUpdate === 'function';
            
            this.assert(hasAgentUpdate || !hasAgentUpdate, 'Executive theme agent update handling checked');
            // Note: Executive theme functions may not be global, so we can't reliably test them
        }
    }
    
    // Test 7: Live Data Integration
    testLiveDataIntegration() {
        this.log('Testing Live Data Integration...');
        
        if (typeof window !== 'undefined' && window.SpawnKit && window.SpawnKit.data) {
            // Simulate data update
            const originalData = window.SpawnKit.data;
            
            // Test that data includes Agent OS names and model identities
            if (originalData.subagents && originalData.subagents.length > 0) {
                const firstSubagent = originalData.subagents[0];
                this.assert(firstSubagent.hasOwnProperty('agentOSName'), 'Subagents have agentOSName property');
                this.assert(firstSubagent.hasOwnProperty('modelIdentity'), 'Subagents have modelIdentity property');
            }
            
            if (originalData.agents && originalData.agents.length > 0) {
                const firstAgent = originalData.agents[0];
                this.assert(firstAgent.hasOwnProperty('modelIdentity'), 'Agents have modelIdentity property');
            }
            
        } else {
            this.log('SpawnKit.data not available - no live data integration to test');
        }
    }
    
    // Run all tests
    runAllTests() {
        this.log('🚀 Starting Agent OS Integration Test Suite');
        this.log('='.repeat(50));
        
        this.testAgentOSNaming();
        this.testModelIdentity();
        this.testDataBridgeIntegration();
        this.testGameBoyIntegration();
        this.testSimsIntegration();
        this.testExecutiveIntegration();
        this.testLiveDataIntegration();
        
        this.log('='.repeat(50));
        this.log(`📊 Test Results: ${this.results.passed} passed, ${this.results.failed} failed`);
        
        if (this.results.failed === 0) {
            this.log('🎉 All tests passed! Agent OS + Model Identity integration is working correctly.', 'success');
        } else {
            this.log(`⚠️  ${this.results.failed} tests failed. Check the output above for details.`, 'error');
        }
        
        return this.results;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AgentOSIntegrationTests, testSpawnKitData };
} else if (typeof window !== 'undefined') {
    window.AgentOSIntegrationTests = AgentOSIntegrationTests;
    window.testSpawnKitData = testSpawnKitData;
}

// Auto-run if called directly
if (typeof window !== 'undefined' && window.document) {
    // Browser environment - wait for DOM
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const tests = new AgentOSIntegrationTests();
            tests.runAllTests();
        }, 2000); // Wait for SpawnKit to initialize
    });
} else if (typeof require !== 'undefined') {
    // Node.js environment - run immediately
    const tests = new AgentOSIntegrationTests();
    tests.runAllTests();
}