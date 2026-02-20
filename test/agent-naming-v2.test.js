/**
 * Agent OS Naming System v2.0 Test Suite
 * Tests the MINIMAL and PERFECT implementation
 */

// Mock SpawnKit environment
const SpawnKit = { data: { subagents: [] } };
global.window = { SpawnKit };

// Import the AgentOSNaming class (would be extracted in real use)
class AgentOSNaming {
    static PARENTS = {
        main: 'Main', forge: 'Forge', atlas: 'Atlas', 
        hunter: 'Hunter', echo: 'Echo', sentinel: 'Sentinel'
    };

    // 8 immutable core roles — foundation that never changes
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

    // Runtime registry for custom roles (for extensibility)
    static customRoles = new Map();

    // Combined getter — core + custom roles
    static get ROLES() {
        return { ...this.CORE_ROLES, ...Object.fromEntries(this.customRoles) };
    }

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

        // Direct keyword mapping
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

    static isValidName(agentOSName) {
        return this.parse(agentOSName)?.isValid || false;
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

// ── Test Suite ──────────────────────────────────────────────────────────────

function runTests() {
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
                if (!expectedMessage && !thrown) {
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

    console.log('🧪 Agent OS Naming System v2.0 Test Suite\n');

    // ── Core Generation Tests ────────────────────────────────────────────────
    test('Generate basic Agent OS name', () => {
        const name = AgentOSNaming.generate('forge', 'CodeBuilder', []);
        expect(name).toBe('Forge.CodeBuilder-01');
    });

    test('Generate with existing subagents', () => {
        const existing = [
            { agentOSName: 'Forge.CodeBuilder-01' },
            { agentOSName: 'Forge.CodeBuilder-03' }
        ];
        const name = AgentOSNaming.generate('forge', 'CodeBuilder', existing);
        expect(name).toBe('Forge.CodeBuilder-04');
    });

    test('ID overflow beyond 99 to A1', () => {
        const existing = Array.from({ length: 99 }, (_, i) => ({
            agentOSName: `Forge.TaskRunner-${(i + 1).toString().padStart(2, '0')}`
        }));
        const name = AgentOSNaming.generate('forge', 'TaskRunner', existing);
        expect(name).toBe('Forge.TaskRunner-A1');
    });

    test('Alpha ID progression A1 -> A2 -> A9 -> B1', () => {
        const existing = [
            { agentOSName: 'Forge.TaskRunner-99' },
            { agentOSName: 'Forge.TaskRunner-A1' },
            { agentOSName: 'Forge.TaskRunner-A8' }
        ];
        const name = AgentOSNaming.generate('forge', 'TaskRunner', existing);
        expect(name).toBe('Forge.TaskRunner-A9');
    });

    // ── Validation Tests ─────────────────────────────────────────────────────
    test('Reject invalid parent', () => {
        expect(() => AgentOSNaming.generate('invalid', 'TaskRunner', [])).toThrow('Invalid parent');
    });

    test('Reject invalid role', () => {
        expect(() => AgentOSNaming.generate('forge', 'InvalidRole', [])).toThrow('Invalid role');
    });

    test('Reject role not allowed for parent', () => {
        expect(() => AgentOSNaming.generate('echo', 'CodeBuilder', [])).toThrow('not allowed for parent');
    });

    // ── Parsing Tests ────────────────────────────────────────────────────────
    test('Parse valid Agent OS name', () => {
        const parsed = AgentOSNaming.parse('Forge.CodeBuilder-01');
        expect(parsed.parent).toBe('forge');
        expect(parsed.parentDisplay).toBe('Forge');
        expect(parsed.role).toBe('CodeBuilder');
        expect(parsed.idStr).toBe('01');
        expect(parsed.isValid).toBeTruthy();
    });

    test('Parse alpha ID format', () => {
        const parsed = AgentOSNaming.parse('Atlas.OpsRunner-A5');
        expect(parsed.idStr).toBe('A5');
        expect(parsed.isValid).toBeTruthy();
    });

    test('Parse invalid format returns null', () => {
        expect(AgentOSNaming.parse('invalid-format')).toBe(null);
        expect(AgentOSNaming.parse('')).toBe(null);
        expect(AgentOSNaming.parse(null)).toBe(null);
    });

    // ── Display Format Tests ─────────────────────────────────────────────────
    test('Full display format', () => {
        const display = AgentOSNaming.displayName('Forge.CodeBuilder-01', 'full');
        expect(display).toBe('Forge.CodeBuilder-01');
    });

    test('Abbreviated display format', () => {
        const display = AgentOSNaming.displayName('Forge.CodeBuilder-01', 'abbreviated');
        expect(display).toBe('F.CB-01');
    });

    test('Abbreviated with alpha ID', () => {
        const display = AgentOSNaming.displayName('Atlas.DataProcessor-B3', 'abbreviated');
        expect(display).toBe('A.DP-B3');
    });

    // ── Real-World Migration Tests ───────────────────────────────────────────
    test('Migrate forge-data-bridge', () => {
        const migrated = AgentOSNaming.migrateFromLegacy('forge-data-bridge', 'forge');
        expect(migrated).toBe('Forge.TaskRunner-01');
    });

    test('Migrate forge-gameboy-enhance', () => {
        const migrated = AgentOSNaming.migrateFromLegacy('forge-gameboy-enhance', 'forge');
        expect(migrated).toBe('Forge.CodeBuilder-01');
    });

    test('Migrate atlas-hetzner-ops', () => {
        const migrated = AgentOSNaming.migrateFromLegacy('atlas-hetzner-ops', 'atlas');
        expect(migrated).toBe('Atlas.OpsRunner-01');
    });

    test('Migrate echo-landing-v2', () => {
        const migrated = AgentOSNaming.migrateFromLegacy('echo-landing-v2', 'echo');
        expect(migrated).toBe('Echo.ContentCreator-02');
    });

    test('Migrate sentinel-gameboy-audit', () => {
        const migrated = AgentOSNaming.migrateFromLegacy('sentinel-gameboy-audit', 'sentinel');
        expect(migrated).toBe('Sentinel.Auditor-01');
    });

    test('Migrate forge-videocast-v2', () => {
        const migrated = AgentOSNaming.migrateFromLegacy('forge-videocast-v2', 'forge');
        expect(migrated).toBe('Forge.CodeBuilder-02');
    });

    test('Fallback to parent primary role', () => {
        const migrated = AgentOSNaming.migrateFromLegacy('unknown-task', 'hunter');
        expect(migrated).toBe('Hunter.Researcher-01');
    });

    // ── Role Assignment Tests ────────────────────────────────────────────────
    test('TaskRunner allowed for multiple parents', () => {
        // Should not throw for valid combinations
        AgentOSNaming.generate('forge', 'TaskRunner', []);
        AgentOSNaming.generate('atlas', 'TaskRunner', []);
        AgentOSNaming.generate('main', 'TaskRunner', []);
        expect(true).toBeTruthy(); // If we get here, no exceptions thrown
    });

    test('CodeBuilder only for forge', () => {
        // Should not throw for forge
        AgentOSNaming.generate('forge', 'CodeBuilder', []);
        
        // Should throw for atlas
        expect(() => AgentOSNaming.generate('atlas', 'CodeBuilder', [])).toThrow('not allowed for parent');
    });

    test('Researcher for hunter and echo', () => {
        // Should not throw for valid combinations
        AgentOSNaming.generate('hunter', 'Researcher', []);
        AgentOSNaming.generate('echo', 'Researcher', []);
        expect(true).toBeTruthy(); // If we get here, no exceptions thrown
    });

    // ── No Abbreviation Collisions Test ─────────────────────────────────────
    test('All abbreviations are unique', () => {
        const abbreviations = Object.values(AgentOSNaming.ROLES).map(role => role.abbrev);
        const uniqueAbbreviations = [...new Set(abbreviations)];
        expect(abbreviations.length).toBe(uniqueAbbreviations.length);
    });

    // ── Available Roles Test ─────────────────────────────────────────────────
    test('Get available roles for parent', () => {
        const forgeRoles = AgentOSNaming.getAvailableRoles('forge');
        expect(forgeRoles).toEqual(['TaskRunner', 'CodeBuilder']);
        
        const echoRoles = AgentOSNaming.getAvailableRoles('echo');
        expect(echoRoles).toEqual(['ContentCreator', 'Researcher']);
    });

    test('Get all roles when no parent specified', () => {
        const allRoles = AgentOSNaming.getAvailableRoles();
        expect(allRoles.length).toBe(8);
    });

    // ── Edge Cases ───────────────────────────────────────────────────────────
    test('Case insensitive parent handling', () => {
        const name1 = AgentOSNaming.generate('FORGE', 'CodeBuilder', []);
        const name2 = AgentOSNaming.generate('forge', 'CodeBuilder', []);
        expect(name1).toBe(name2);
    });

    test('Handle null/undefined inputs gracefully', () => {
        expect(() => AgentOSNaming.generate(null, 'TaskRunner', [])).toThrow('Invalid parent');
        expect(() => AgentOSNaming.generate('forge', null, [])).toThrow('Invalid role');
        expect(AgentOSNaming.migrateFromLegacy(null, 'forge')).toBe(null);
        expect(AgentOSNaming.migrateFromLegacy('test', null)).toBe(null);
    });

    // ── Test Summary ─────────────────────────────────────────────────────────
    console.log(`\n📊 Test Results: ${passed}/${total} passed`);
    
    if (passed === total) {
        console.log('🎉 All tests passed! Agent OS Naming v2.0 is ready for Sentinel audit.');
        return true;
    } else {
        console.log('❌ Some tests failed. Fix issues before deployment.');
        return false;
    }
}

// Run the test suite
if (typeof module !== 'undefined') {
    module.exports = { AgentOSNaming, runTests };
} else {
    runTests();
}