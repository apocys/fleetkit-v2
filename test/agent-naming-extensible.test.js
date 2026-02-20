/**
 * Agent OS Naming System v2.0 — EXTENSIBLE Test Suite
 * Tests the custom role registration and extensibility features
 */

// Create extensible AgentOSNaming class for testing
class AgentOSNaming {
    static PARENTS = {
        main: 'Main', forge: 'Forge', atlas: 'Atlas', 
        hunter: 'Hunter', echo: 'Echo', sentinel: 'Sentinel'
    };

    static CORE_ROLES = {
        TaskRunner: { abbrev: 'TR', parents: ['forge', 'atlas', 'main'], core: true },
        CodeBuilder: { abbrev: 'CB', parents: ['forge'], core: true },
        DataProcessor: { abbrev: 'DP', parents: ['atlas'], core: true },
        ContentCreator: { abbrev: 'CC', parents: ['echo'], core: true },
        OpsRunner: { abbrev: 'OR', parents: ['atlas'], core: true },
        Auditor: { abbrev: 'AU', parents: ['sentinel'], core: true },
        Researcher: { abbrev: 'RE', parents: ['hunter', 'echo'], core: true },
        Coordinator: { abbrev: 'CO', parents: ['main', 'atlas'], core: true }
    };

    static customRoles = new Map();

    static get ROLES() {
        return { ...this.CORE_ROLES, ...Object.fromEntries(this.customRoles) };
    },

    registerRole(name, config) {
        // Validate role name
        if (!name || typeof name !== 'string') {
            throw new Error('Role name must be a non-empty string');
        }
        
        if (!/^[A-Z][a-zA-Z0-9]{2,19}$/.test(name)) {
            throw new Error('Role name must be PascalCase, alphanumeric, 3-20 characters');
        }

        // Check if role already exists (core or custom)
        if (this.CORE_ROLES[name] || this.customRoles.has(name)) {
            throw new Error(`Role '${name}' already exists and cannot be modified`);
        }

        // Validate config
        if (!config || typeof config !== 'object') {
            throw new Error('Config must be an object');
        }

        const { abbreviation, parents, category, description } = config;

        // Validate abbreviation
        if (!abbreviation || typeof abbreviation !== 'string') {
            throw new Error('Abbreviation is required and must be a string');
        }
        
        if (!/^[A-Z0-9]{2,4}$/.test(abbreviation)) {
            throw new Error('Abbreviation must be 2-4 uppercase alphanumeric characters');
        }

        // Check for abbreviation collisions (core + custom)
        const allAbbrevs = new Set([
            ...Object.values(this.CORE_ROLES).map(r => r.abbrev),
            ...Array.from(this.customRoles.values()).map(r => r.abbrev)
        ]);
        
        if (allAbbrevs.has(abbreviation)) {
            throw new Error(`Abbreviation '${abbreviation}' already exists`);
        }

        // Validate parents
        if (!Array.isArray(parents) || parents.length === 0) {
            throw new Error('Parents must be a non-empty array');
        }

        const validParents = Object.keys(this.PARENTS);
        const invalidParents = parents.filter(p => !validParents.includes(p));
        if (invalidParents.length > 0) {
            throw new Error(`Invalid parent agents: ${invalidParents.join(', ')}`);
        }

        // Register the custom role
        this.customRoles.set(name, {
            abbrev: abbreviation,
            parents: [...parents], // Clone array
            category: category || 'custom',
            description: description || '',
            core: false,
            registeredAt: new Date().toISOString()
        });

        return true;
    }

    static listRoles() {
        const roles = this.ROLES;
        return {
            core: Object.entries(this.CORE_ROLES).map(([name, info]) => ({
                name,
                ...info
            })),
            custom: Array.from(this.customRoles.entries()).map(([name, info]) => ({
                name,
                ...info
            })),
            total: Object.keys(roles).length,
            coreCount: Object.keys(this.CORE_ROLES).length,
            customCount: this.customRoles.size
        };
    }

    static clearCustomRoles() {
        this.customRoles.clear();
    }

    static isCustomRole(roleName) {
        return this.customRoles.has(roleName);
    }

    static isCoreRole(roleName) {
        return !!this.CORE_ROLES[roleName];
    }

    // Include the core generation logic from the main test
    static generate(parent, role, existingSubagents = []) {
        const parentKey = parent?.toLowerCase();
        const parentDisplay = this.PARENTS[parentKey];
        if (!parentDisplay) {
            throw new Error(`Invalid parent: ${parent}`);
        }

        const roleInfo = this.ROLES[role];
        if (!roleInfo) {
            throw new Error(`Invalid role: ${role}`);
        }

        if (!roleInfo.parents.includes(parentKey)) {
            throw new Error(`Role ${role} not allowed for parent ${parent}`);
        }

        const nextId = this.getNextId(parentDisplay, role, existingSubagents);
        return `${parentDisplay}.${role}-${nextId}`;
    }

    static getNextId(parentDisplay, role, existingSubagents) {
        // Extract existing numeric IDs (01-99)
        const pattern = new RegExp(`^${parentDisplay}\\.${role}-(\\d{2})$`);
        const numericIds = existingSubagents
            .map(sa => sa.agentOSName?.match(pattern)?.[1])
            .filter(Boolean)
            .map(id => parseInt(id, 10))
            .filter(id => !isNaN(id) && id >= 1 && id <= 99);

        if (numericIds.length === 0) return '01';
        
        const maxId = Math.max(...numericIds);
        if (maxId < 99) return (maxId + 1).toString().padStart(2, '0');
        
        // ID overflow beyond 99: alphabetic suffix (A1, A2, ..., Z9)
        const alphaPattern = new RegExp(`^${parentDisplay}\\.${role}-([A-Z]\\d)$`);
        const alphaIds = existingSubagents
            .map(sa => sa.agentOSName?.match(alphaPattern)?.[1])
            .filter(Boolean);
        
        if (alphaIds.length === 0) return 'A1';
        
        // Find next alpha ID
        const lastAlpha = alphaIds.sort().pop();
        const letter = lastAlpha.charAt(0);
        const num = parseInt(lastAlpha.charAt(1), 10);
        
        if (num < 9) return letter + (num + 1);
        if (letter < 'Z') return String.fromCharCode(letter.charCodeAt(0) + 1) + '1';
        
        throw new Error('ID space exhausted (Z9 reached)');
    }

    static parse(agentOSName) {
        if (!agentOSName) return null;
        
        // Parse standard format: Parent.Role-ID
        const match = agentOSName.match(/^(\w+)\.(\w+)-([A-Z]?\d+)$/);
        if (!match) return null;
        
        const [, parentDisplay, role, idStr] = match;
        
        // Validate parent and role
        const parentKey = Object.keys(this.PARENTS).find(key => this.PARENTS[key] === parentDisplay);
        const roleInfo = this.ROLES[role];
        
        return {
            parent: parentKey,
            parentDisplay,
            role,
            idStr,
            full: agentOSName,
            isValid: !!parentKey && !!roleInfo && roleInfo.parents.includes(parentKey)
        };
    }

    static displayName(agentOSName, format = 'full') {
        const parsed = this.parse(agentOSName);
        if (!parsed?.isValid) return agentOSName;

        if (format === 'abbreviated') {
            const roleAbbrev = this.ROLES[parsed.role]?.abbrev || 'XX';
            return `${parsed.parentDisplay[0]}.${roleAbbrev}-${parsed.idStr}`;
        }
        
        return agentOSName; // full format
    }

    static migrateFromLegacy(legacyName, parentAgent) {
        const parentKey = parentAgent?.toLowerCase();
        const parentDisplay = this.PARENTS[parentKey];
        if (!parentDisplay || !legacyName) return null;

        // Real-world label mapping based on keywords
        const legacyLower = legacyName.toLowerCase();
        let targetRole = null;

        // Direct keyword mapping - audit first to catch sentinel-gameboy-audit
        if (legacyLower.includes('audit') || legacyLower.includes('review')) {
            targetRole = 'Auditor'; // sentinel-gameboy-audit
        } else if (legacyLower.includes('data') || legacyLower.includes('bridge')) {
            targetRole = 'TaskRunner'; // forge-data-bridge
        } else if (legacyLower.includes('gameboy') || legacyLower.includes('enhance')) {
            targetRole = 'CodeBuilder'; // forge-gameboy-enhance
        } else if (legacyLower.includes('ops') || legacyLower.includes('hetzner')) {
            targetRole = 'OpsRunner'; // atlas-hetzner-ops
        } else if (legacyLower.includes('landing') || legacyLower.includes('content')) {
            targetRole = 'ContentCreator'; // echo-landing-v2
        } else if (legacyLower.includes('videocast') || legacyLower.includes('video')) {
            targetRole = 'CodeBuilder'; // forge-videocast-v2
        }

        // Fallback to parent's primary role
        if (!targetRole) {
            const fallbacks = {
                forge: 'CodeBuilder',
                atlas: 'OpsRunner', 
                echo: 'ContentCreator',
                hunter: 'Researcher',
                sentinel: 'Auditor',
                main: 'Coordinator'
            };
            targetRole = fallbacks[parentKey];
        }

        // Extract ID from legacy name (e.g., -v2 → 02)
        const versionMatch = legacyName?.match(/-v(\d+)$/);
        const numMatch = legacyName?.match(/-(\d+)$/);
        const extractedId = versionMatch?.[1] || numMatch?.[1];
        
        try {
            if (targetRole && this.ROLES[targetRole]?.parents.includes(parentKey)) {
                const baseId = extractedId ? extractedId.padStart(2, '0') : '01';
                return `${parentDisplay}.${targetRole}-${baseId}`;
            }
        } catch (e) {
            console.warn(`Legacy migration failed for ${legacyName}:`, e.message);
        }

        return null;
    }

    static getRoleInfo(role) {
        return this.ROLES[role] || null;
    }

    static getAvailableRoles(parentAgent) {
        const parentKey = parentAgent?.toLowerCase();
        if (!parentKey) return Object.keys(this.ROLES);
        
        return Object.entries(this.ROLES)
            .filter(([, info]) => info.parents.includes(parentKey))
            .map(([role]) => role);
    }
}

// ── Extensible Test Suite ─────────────────────────────────────────────────

function runExtensibilityTests() {
    let passed = 0;
    let total = 0;

    function test(description, fn) {
        total++;
        try {
            fn();
            console.log(`✅ ${description}`);
            passed++;
        } catch (e) {
            console.error(`❌ ${description}:`, e.message);
        }
    }

    function expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${expected}, got ${actual}`);
                }
            },
            toEqual: (expected) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
                }
            },
            toThrow: (expectedMessage) => {
                let thrown = false;
                try {
                    actual();
                } catch (e) {
                    thrown = true;
                    if (expectedMessage && !e.message.includes(expectedMessage)) {
                        throw new Error(`Expected error containing "${expectedMessage}", got "${e.message}"`);
                    }
                }
                if (!thrown) {
                    throw new Error('Expected function to throw');
                }
            },
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected truthy value, got ${actual}`);
                }
            },
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected falsy value, got ${actual}`);
                }
            }
        };
    }

    console.log('🧪 Agent OS Naming System v2.0 — EXTENSIBILITY Test Suite\n');

    // Clear any existing custom roles before testing
    AgentOSNaming.clearCustomRoles();

    // ── Core Role Registration Tests ──────────────────────────────────────────
    test('Core roles are immutable foundation', () => {
        const coreRoles = Object.keys(AgentOSNaming.CORE_ROLES);
        expect(coreRoles.length).toBe(8);
        expect(coreRoles).toEqual(['TaskRunner', 'CodeBuilder', 'DataProcessor', 'ContentCreator', 'OpsRunner', 'Auditor', 'Researcher', 'Coordinator']);
    });

    test('Cannot modify core roles', () => {
        expect(() => AgentOSNaming.registerRole('TaskRunner', { abbreviation: 'XX', parents: ['forge'] }))
            .toThrow('already exists and cannot be modified');
    });

    // ── Custom Role Registration Tests ────────────────────────────────────────
    test('Register simple custom role', () => {
        const result = AgentOSNaming.registerRole('VideoProducer', {
            abbreviation: 'VP',
            parents: ['echo']
        });
        expect(result).toBeTruthy();
    });

    test('Custom role appears in ROLES getter', () => {
        const allRoles = Object.keys(AgentOSNaming.ROLES);
        expect(allRoles.includes('VideoProducer')).toBeTruthy();
        expect(allRoles.length).toBe(9); // 8 core + 1 custom
    });

    test('Generate Agent OS name with custom role', () => {
        const name = AgentOSNaming.generate('echo', 'VideoProducer', []);
        expect(name).toBe('Echo.VideoProducer-01');
    });

    test('Parse Agent OS name with custom role', () => {
        const parsed = AgentOSNaming.parse('Echo.VideoProducer-01');
        expect(parsed.role).toBe('VideoProducer');
        expect(parsed.isValid).toBeTruthy();
    });

    test('Display custom role in abbreviated format', () => {
        const abbreviated = AgentOSNaming.displayName('Echo.VideoProducer-01', 'abbreviated');
        expect(abbreviated).toBe('E.VP-01');
    });

    // ── Registration Validation Tests ─────────────────────────────────────────
    test('Reject invalid role names', () => {
        expect(() => AgentOSNaming.registerRole('', { abbreviation: 'XX', parents: ['forge'] }))
            .toThrow('Role name must be a non-empty string');
        
        expect(() => AgentOSNaming.registerRole('lowercase', { abbreviation: 'XX', parents: ['forge'] }))
            .toThrow('Role name must be PascalCase');
        
        expect(() => AgentOSNaming.registerRole('A', { abbreviation: 'XX', parents: ['forge'] }))
            .toThrow('3-20 characters');
        
        expect(() => AgentOSNaming.registerRole('TooLongRoleNameThatExceedsTheLimit', { abbreviation: 'XX', parents: ['forge'] }))
            .toThrow('3-20 characters');
    });

    test('Reject invalid abbreviations', () => {
        expect(() => AgentOSNaming.registerRole('TestRole', { abbreviation: '', parents: ['forge'] }))
            .toThrow('Abbreviation is required');
        
        expect(() => AgentOSNaming.registerRole('TestRole1', { abbreviation: 'x', parents: ['forge'] }))
            .toThrow('2-4 uppercase alphanumeric');
        
        expect(() => AgentOSNaming.registerRole('TestRole2', { abbreviation: 'lowercase', parents: ['forge'] }))
            .toThrow('2-4 uppercase alphanumeric');
        
        expect(() => AgentOSNaming.registerRole('TestRole3', { abbreviation: 'TOOLONG', parents: ['forge'] }))
            .toThrow('2-4 uppercase alphanumeric');
    });

    test('Reject duplicate abbreviations', () => {
        expect(() => AgentOSNaming.registerRole('TestRole', { abbreviation: 'TR', parents: ['forge'] }))
            .toThrow('Abbreviation \'TR\' already exists');
        
        expect(() => AgentOSNaming.registerRole('TestRole', { abbreviation: 'VP', parents: ['forge'] }))
            .toThrow('Abbreviation \'VP\' already exists');
    });

    test('Reject invalid parents', () => {
        expect(() => AgentOSNaming.registerRole('TestRole', { abbreviation: 'XX', parents: [] }))
            .toThrow('Parents must be a non-empty array');
        
        expect(() => AgentOSNaming.registerRole('TestRole1', { abbreviation: 'XX', parents: ['invalid'] }))
            .toThrow('Invalid parent agents: invalid');
        
        expect(() => AgentOSNaming.registerRole('TestRole2', { abbreviation: 'XX', parents: ['forge', 'invalid'] }))
            .toThrow('Invalid parent agents: invalid');
    });

    test('Reject missing config', () => {
        expect(() => AgentOSNaming.registerRole('TestRole', null))
            .toThrow('Config must be an object');
        
        expect(() => AgentOSNaming.registerRole('TestRole1', {}))
            .toThrow('Abbreviation is required');
        
        expect(() => AgentOSNaming.registerRole('TestRole2', { abbreviation: 'XX' }))
            .toThrow('Parents must be a non-empty array');
    });

    // ── Advanced Registration Tests ───────────────────────────────────────────
    test('Register role with metadata', () => {
        AgentOSNaming.registerRole('DataScientist', {
            abbreviation: 'DS',
            parents: ['atlas'],
            category: 'analytics',
            description: 'Advanced data science and machine learning'
        });
        
        const roleInfo = AgentOSNaming.getRoleInfo('DataScientist');
        expect(roleInfo.category).toBe('analytics');
        expect(roleInfo.description).toBe('Advanced data science and machine learning');
        expect(roleInfo.core).toBeFalsy();
    });

    test('Register role with multiple parents', () => {
        AgentOSNaming.registerRole('MLEngineer', {
            abbreviation: 'ML',
            parents: ['atlas', 'forge']
        });
        
        // Should work for both parents
        const name1 = AgentOSNaming.generate('atlas', 'MLEngineer', []);
        const name2 = AgentOSNaming.generate('forge', 'MLEngineer', []);
        
        expect(name1).toBe('Atlas.MLEngineer-01');
        expect(name2).toBe('Forge.MLEngineer-01');
    });

    test('Cannot register duplicate custom roles', () => {
        expect(() => AgentOSNaming.registerRole('VideoProducer', { abbreviation: 'VX', parents: ['echo'] }))
            .toThrow('already exists and cannot be modified');
    });

    // ── Role Listing and Metadata Tests ───────────────────────────────────────
    test('List all roles shows core and custom', () => {
        const roleList = AgentOSNaming.listRoles();
        
        expect(roleList.coreCount).toBe(8);
        expect(roleList.customCount).toBe(3); // VideoProducer, DataScientist, MLEngineer
        expect(roleList.total).toBe(11);
        
        expect(roleList.core.length).toBe(8);
        expect(roleList.custom.length).toBe(3);
        
        // Check core roles have core: true
        expect(roleList.core.every(role => role.core === true)).toBeTruthy();
        
        // Check custom roles have core: false
        expect(roleList.custom.every(role => role.core === false)).toBeTruthy();
    });

    test('Role classification methods', () => {
        expect(AgentOSNaming.isCoreRole('TaskRunner')).toBeTruthy();
        expect(AgentOSNaming.isCoreRole('VideoProducer')).toBeFalsy();
        
        expect(AgentOSNaming.isCustomRole('VideoProducer')).toBeTruthy();
        expect(AgentOSNaming.isCustomRole('TaskRunner')).toBeFalsy();
    });

    // ── Integration with Existing System Tests ────────────────────────────────
    test('Available roles includes custom roles', () => {
        const echoRoles = AgentOSNaming.getAvailableRoles('echo');
        expect(echoRoles.includes('VideoProducer')).toBeTruthy();
        expect(echoRoles.includes('ContentCreator')).toBeTruthy();
    });

    test('Custom roles work with ID progression', () => {
        const existing = [
            { agentOSName: 'Echo.VideoProducer-01' },
            { agentOSName: 'Echo.VideoProducer-03' }
        ];
        
        const name = AgentOSNaming.generate('echo', 'VideoProducer', existing);
        expect(name).toBe('Echo.VideoProducer-04');
    });

    test('Custom roles work with ID overflow', () => {
        const existing = Array.from({ length: 99 }, (_, i) => ({
            agentOSName: `Echo.VideoProducer-${(i + 1).toString().padStart(2, '0')}`
        }));
        
        const name = AgentOSNaming.generate('echo', 'VideoProducer', existing);
        expect(name).toBe('Echo.VideoProducer-A1');
    });

    test('Legacy migration only targets core roles', () => {
        // Custom roles should not be auto-migrated from legacy names
        const migrated = AgentOSNaming.migrateFromLegacy('echo-video-production', 'echo');
        expect(migrated).toBe('Echo.ContentCreator-01'); // Falls back to parent's primary role
    });

    // ── No Breaking Changes Tests ─────────────────────────────────────────────
    test('Adding custom roles never breaks existing names', () => {
        // Create some names with core roles
        const coreName1 = 'Forge.TaskRunner-01';
        const coreName2 = 'Atlas.DataProcessor-05';
        
        // Parse them
        const parsed1Before = AgentOSNaming.parse(coreName1);
        const parsed2Before = AgentOSNaming.parse(coreName2);
        
        // Add more custom roles
        AgentOSNaming.registerRole('CustomRole1', { abbreviation: 'C1', parents: ['forge'] });
        AgentOSNaming.registerRole('CustomRole2', { abbreviation: 'C2', parents: ['atlas'] });
        
        // Parse the same names again
        const parsed1After = AgentOSNaming.parse(coreName1);
        const parsed2After = AgentOSNaming.parse(coreName2);
        
        // Should be identical
        expect(parsed1After).toEqual(parsed1Before);
        expect(parsed2After).toEqual(parsed2Before);
        
        // Should still be valid
        expect(parsed1After.isValid).toBeTruthy();
        expect(parsed2After.isValid).toBeTruthy();
    });

    // ── Edge Cases and Error Handling ─────────────────────────────────────────
    test('Handle clearing custom roles', () => {
        expect(AgentOSNaming.customRoles.size).toBe(5); // VideoProducer, DataScientist, MLEngineer, CustomRole1, CustomRole2
        
        AgentOSNaming.clearCustomRoles();
        expect(AgentOSNaming.customRoles.size).toBe(0);
        
        // Core roles should still be there
        expect(Object.keys(AgentOSNaming.CORE_ROLES).length).toBe(8);
        expect(Object.keys(AgentOSNaming.ROLES).length).toBe(8); // Only core roles now
    });

    test('System works with no custom roles', () => {
        // After clearing, should work exactly like before extensibility
        const name = AgentOSNaming.generate('forge', 'TaskRunner', []);
        expect(name).toBe('Forge.TaskRunner-01');
        
        const parsed = AgentOSNaming.parse('Forge.TaskRunner-01');
        expect(parsed.isValid).toBeTruthy();
    });

    // ── Test Summary ─────────────────────────────────────────────────────────
    console.log(`\n📊 Extensibility Test Results: ${passed}/${total} passed`);
    
    if (passed === total) {
        console.log('🎉 All extensibility tests passed! System is ready for custom roles.');
        return true;
    } else {
        console.log('❌ Some extensibility tests failed. Fix issues before deployment.');
        return false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined') {
    module.exports = { AgentOSNaming, runExtensibilityTests };
}

// Run tests if called directly
if (require.main === module) {
    runExtensibilityTests();
}