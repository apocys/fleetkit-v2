/**
 * Agent Passport — Extract & Import
 * 
 * Converts between SpawnKit Agent Passport (JSON) and OpenClaw context files (SOUL.md, USER.md).
 * 
 * Usage:
 *   node passport.js extract <USER.md> <SOUL.md> [output.json]   — Extract passport from OpenClaw files
 *   node passport.js import <passport.json> [output-dir]          — Generate SOUL.md + USER.md from passport
 *   node passport.js validate <passport.json>                     — Validate against schema
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, 'schema.json');

// ─── EXTRACT: OpenClaw files → Passport JSON ────────────────────

function extractFromMarkdown(userMd, soulMd) {
  const passport = {
    name: '',
    goals: [],
    working_style: {},
    active_projects: [],
    do_list: [],
    dont_list: [],
    expertise: [],
    meta: {
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: '1.0.0',
      source: 'extracted'
    }
  };

  // Parse USER.md
  if (userMd) {
    // Name
    const nameMatch = userMd.match(/\*\*Name:\*\*\s*(.+)/i) || userMd.match(/Name:\s*(.+)/i);
    if (nameMatch) passport.name = nameMatch[1].trim().replace(/[()].*/g, '').trim();

    // Timezone
    const tzMatch = userMd.match(/\*\*Timezone:\*\*\s*(.+)/i) || userMd.match(/Timezone:\s*(.+)/i);
    if (tzMatch) {
      const tz = tzMatch[1].trim();
      passport.working_style.timezone = tz.includes('CET') ? 'Europe/Paris' : tz;
    }

    // Response style → do_list
    const styleSection = userMd.match(/## Response Style\n([\s\S]*?)(?=\n##|$)/i);
    if (styleSection) {
      const lines = styleSection[1].split('\n').filter(l => /^\d+\./.test(l.trim()));
      for (const line of lines) {
        const text = line.replace(/^\d+\.\s*/, '').trim();
        if (text) passport.do_list.push(text);
      }
    }

    // Domain expertise
    const expertSection = userMd.match(/## Domain Expertise\n([\s\S]*?)(?=\n##|$)/i);
    if (expertSection) {
      const lines = expertSection[1].split('\n').filter(l => l.trim().startsWith('-'));
      for (const line of lines) {
        const text = line.replace(/^-\s*/, '').trim();
        if (text) passport.expertise.push(text);
      }
    }

    // Infer working style from response preferences
    const hasDirectStyle = passport.do_list.some(d => /direct|no fluff|concise/i.test(d));
    const hasDetailStyle = passport.do_list.some(d => /thorough|detailed|complex/i.test(d));
    passport.working_style.communication = hasDirectStyle ? 'direct' : 'diplomatic';
    passport.working_style.detail_level = hasDetailStyle ? 'balanced' : 'concise';
    passport.working_style.decision_speed = 'fast';
    passport.working_style.feedback_style = 'blunt';
  }

  // Parse SOUL.md for personality / don'ts
  if (soulMd) {
    const lines = soulMd.split('\n').filter(l => l.trim().startsWith('-'));
    for (const line of lines) {
      const text = line.replace(/^-\s*/, '').trim();
      if (/don't|never|avoid|no\s/i.test(text)) {
        passport.dont_list.push(text);
      }
    }
  }

  return passport;
}

// ─── IMPORT: Passport JSON → OpenClaw files ─────────────────────

function importToMarkdown(passport) {
  // Generate USER.md
  let userMd = `# USER.md - About ${passport.name || 'User'}\n\n`;
  userMd += `- **Name:** ${passport.name}\n`;
  if (passport.working_style?.timezone) {
    userMd += `- **Timezone:** ${passport.working_style.timezone}\n`;
  }
  userMd += '\n';

  // Response style from do_list
  if (passport.do_list?.length) {
    userMd += '## Response Style\n\n';
    passport.do_list.forEach((item, i) => {
      userMd += `${i + 1}. ${item}\n`;
    });
    userMd += '\n';
  }

  // Don'ts
  if (passport.dont_list?.length) {
    userMd += '## Avoid\n\n';
    passport.dont_list.forEach(item => {
      userMd += `- ${item}\n`;
    });
    userMd += '\n';
  }

  // Domain expertise
  if (passport.expertise?.length) {
    userMd += '## Domain Expertise\n\n';
    passport.expertise.forEach(item => {
      userMd += `- ${item}\n`;
    });
    userMd += '\n';
  }

  // Active projects
  if (passport.active_projects?.length) {
    userMd += '## Active Projects\n\n';
    passport.active_projects.forEach(p => {
      userMd += `### ${p.name}\n`;
      if (p.description) userMd += `${p.description}\n`;
      if (p.role) userMd += `- **Role:** ${p.role}\n`;
      if (p.stack?.length) userMd += `- **Stack:** ${p.stack.join(', ')}\n`;
      if (p.repo) userMd += `- **Repo:** ${p.repo}\n`;
      userMd += '\n';
    });
  }

  // Generate SOUL.md
  let soulMd = `# SOUL.md\n\n`;
  soulMd += `I work with ${passport.name || 'the user'}.\n\n`;

  if (passport.working_style) {
    soulMd += '## Communication Style\n\n';
    const ws = passport.working_style;
    if (ws.communication) soulMd += `- Tone: ${ws.communication}\n`;
    if (ws.detail_level) soulMd += `- Detail: ${ws.detail_level}\n`;
    if (ws.decision_speed) soulMd += `- Decision pace: ${ws.decision_speed}\n`;
    if (ws.feedback_style) soulMd += `- Feedback: ${ws.feedback_style}\n`;
    soulMd += '\n';
  }

  // Goals
  if (passport.goals?.length) {
    soulMd += '## Current Goals\n\n';
    passport.goals.forEach(g => {
      const priority = g.priority ? ` [${g.priority}]` : '';
      const deadline = g.deadline ? ` (by ${g.deadline})` : '';
      soulMd += `- ${g.goal}${priority}${deadline}\n`;
    });
    soulMd += '\n';
  }

  return { userMd, soulMd };
}

// ─── VALIDATE ───────────────────────────────────────────────────

function validate(passport) {
  const errors = [];
  
  if (!passport.name || typeof passport.name !== 'string') {
    errors.push('Missing or invalid "name" (required string)');
  }
  if (!passport.goals || !Array.isArray(passport.goals) || passport.goals.length === 0) {
    errors.push('Missing or empty "goals" (required, min 1)');
  }
  if (passport.goals) {
    passport.goals.forEach((g, i) => {
      if (!g.goal) errors.push(`goals[${i}]: missing "goal" field`);
      if (g.priority && !['high', 'medium', 'low'].includes(g.priority)) {
        errors.push(`goals[${i}]: invalid priority "${g.priority}"`);
      }
    });
  }
  if (passport.working_style?.communication) {
    if (!['direct', 'diplomatic', 'casual', 'formal'].includes(passport.working_style.communication)) {
      errors.push(`Invalid working_style.communication: "${passport.working_style.communication}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── CLI ────────────────────────────────────────────────────────

function main() {
  const [,, command, ...args] = process.argv;

  switch (command) {
    case 'extract': {
      const userPath = args[0];
      const soulPath = args[1];
      const outPath = args[2] || 'passport.json';

      if (!userPath) {
        console.error('Usage: node passport.js extract <USER.md> [SOUL.md] [output.json]');
        process.exit(1);
      }

      const userMd = fs.existsSync(userPath) ? fs.readFileSync(userPath, 'utf8') : null;
      const soulMd = soulPath && fs.existsSync(soulPath) ? fs.readFileSync(soulPath, 'utf8') : null;

      if (!userMd) {
        console.error(`File not found: ${userPath}`);
        process.exit(1);
      }

      const passport = extractFromMarkdown(userMd, soulMd);
      fs.writeFileSync(outPath, JSON.stringify(passport, null, 2));
      console.log(`✅ Passport extracted → ${outPath}`);
      console.log(`   Name: ${passport.name}`);
      console.log(`   Goals: ${passport.goals.length}`);
      console.log(`   Do: ${passport.do_list.length} | Don't: ${passport.dont_list.length}`);
      console.log(`   Expertise: ${passport.expertise.length} domains`);
      break;
    }

    case 'import': {
      const passportPath = args[0];
      const outDir = args[1] || '.';

      if (!passportPath) {
        console.error('Usage: node passport.js import <passport.json> [output-dir]');
        process.exit(1);
      }

      const passport = JSON.parse(fs.readFileSync(passportPath, 'utf8'));
      const { userMd, soulMd } = importToMarkdown(passport);

      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'USER.md'), userMd);
      fs.writeFileSync(path.join(outDir, 'SOUL.md'), soulMd);
      console.log(`✅ Imported → ${outDir}/USER.md + ${outDir}/SOUL.md`);
      break;
    }

    case 'validate': {
      const passportPath = args[0];
      if (!passportPath) {
        console.error('Usage: node passport.js validate <passport.json>');
        process.exit(1);
      }

      const passport = JSON.parse(fs.readFileSync(passportPath, 'utf8'));
      const result = validate(passport);

      if (result.valid) {
        console.log('✅ Passport is valid');
      } else {
        console.log('❌ Validation errors:');
        result.errors.forEach(e => console.log(`   - ${e}`));
        process.exit(1);
      }
      break;
    }

    default:
      console.log('Agent Passport — Extract & Import');
      console.log('');
      console.log('Commands:');
      console.log('  extract <USER.md> [SOUL.md] [output.json]  — Extract passport from OpenClaw files');
      console.log('  import  <passport.json> [output-dir]       — Generate USER.md + SOUL.md from passport');
      console.log('  validate <passport.json>                   — Validate against schema');
  }
}

main();
