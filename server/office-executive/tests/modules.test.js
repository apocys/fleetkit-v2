const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const MODULES_DIR = path.join(__dirname, '..', 'modules');

const MODULE_EXPORTS = {
  'overlays.js':        ['openDetailPanel', 'openTodoForAgent'],
  'chat.js':            ['openMailbox'],
  'missions.js':        ['openMissionsPanel'],
  'settings.js':        ['openSettingsPanel'],
  'brainstorm.js':      ['openMeetingPanel'],
  'marketplace.js':     ['openMarketplace'],
  'skills-catalog.js':  ['openSkills'],
  'creator-profile.js': ['openCreatorProfile'],
};

describe('Module Load Tests', () => {

  for (const [file, expectedGlobals] of Object.entries(MODULE_EXPORTS)) {
    const filePath = path.join(MODULES_DIR, file);

    it(`${file} exists on disk`, () => {
      assert.ok(fs.existsSync(filePath), `${file} not found`);
    });

    it(`${file} is syntactically valid JS`, () => {
      const code = fs.readFileSync(filePath, 'utf-8');
      // vm.compileFunction will throw on syntax errors
      assert.doesNotThrow(() => {
        new vm.Script(code, { filename: file });
      }, `${file} has syntax errors`);
    });

    it(`${file} assigns window.${expectedGlobals.join(', window.')}`, () => {
      const code = fs.readFileSync(filePath, 'utf-8');
      for (const name of expectedGlobals) {
        const pattern = new RegExp(`window\\.${name}\\s*=`);
        assert.ok(pattern.test(code), `Expected window.${name} assignment in ${file}`);
      }
    });
  }

});
