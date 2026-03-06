const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('Static Checks', () => {

  it('No JS file contains hardcoded port "8222"', () => {
    const jsFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.js'));
    for (const file of jsFiles) {
      const content = fs.readFileSync(path.join(ROOT, file), 'utf-8');
      assert.ok(!content.includes('8222'), `${file} contains hardcoded port 8222`);
    }
  });

  it('All module files referenced in index.html exist on disk', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    // Match script src attributes for modules/ directory
    const moduleRefs = html.match(/src="modules\/[^"?]+/g) || [];
    for (const ref of moduleRefs) {
      const relPath = ref.replace('src="', '');
      const fullPath = path.join(ROOT, relPath);
      assert.ok(fs.existsSync(fullPath), `Module ${relPath} referenced in index.html does not exist`);
    }
    assert.ok(moduleRefs.length > 0, 'Expected at least one module reference in index.html');
  });

  it('index.html has no visible legacy grid (no .exec-floor without display:none)', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    // Check there's no exec-floor class used in a visible element
    // The class should either not exist or be inside display:none
    const floorMatches = html.match(/class="[^"]*exec-floor[^"]*"/g) || [];
    for (const match of floorMatches) {
      // Find the surrounding context — the element should have display:none
      const idx = html.indexOf(match);
      // Check 200 chars before for display:none on the same element
      const before = html.substring(Math.max(0, idx - 200), idx + match.length + 200);
      assert.ok(
        before.includes('display:none') || before.includes('display: none'),
        `Found visible .exec-floor element: ${match}`
      );
    }
    // Also verify: no standalone <div class="exec-floor"> without display:none wrapper
    // The grid was decommissioned so the class shouldn't appear at all
    // (passing 0 matches is fine — the grid was fully removed)
  });

});
