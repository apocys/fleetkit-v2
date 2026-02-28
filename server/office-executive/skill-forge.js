(function() {
'use strict';

var TEMPLATES = {
  api: {
    name: 'api-integration',
    desc: 'Integrate with external APIs and web services. Use when the user asks to connect to a REST API, fetch remote data, send webhooks, or automate API calls.',
    instructions: '# API Integration\n\n## Setup\n\nSet your API key:\n```bash\nexport API_KEY=your-key-here\n```\n\n## Quick Start\n\n```bash\ncurl -H "Authorization: Bearer $API_KEY" https://api.example.com/v1/data\n```\n\n## Usage\n\nDescribe the API endpoints, authentication method, and common use cases here.\n\n## Error Handling\n\n- 401: Check API key\n- 429: Rate limit — add retry logic\n- 500: Server error — log and retry'
  },
  file: {
    name: 'file-processor',
    desc: 'Process, transform, and manage files. Use when the user asks to convert file formats, parse CSVs, manipulate PDFs, batch rename files, or extract data from documents.',
    instructions: '# File Processor\n\n## Quick Start\n\n```bash\n{baseDir}/scripts/process.sh input.csv output.json\n```\n\n## Supported Formats\n\n- Input: CSV, JSON, XML, TXT\n- Output: JSON, CSV, Markdown\n\n## Usage\n\nDescribe the processing pipeline, options, and examples here.\n\n## Notes\n\n- Large files are streamed to avoid memory issues\n- Progress is logged to stderr'
  },
  code: {
    name: 'code-generator',
    desc: 'Generate boilerplate code, scaffolding, and templates. Use when the user asks to create a new project, generate CRUD code, scaffold components, or produce repetitive code patterns.',
    instructions: '# Code Generator\n\n## Quick Start\n\n```bash\n{baseDir}/scripts/generate.sh --type component --name MyComponent\n```\n\n## Templates\n\n- `component` — React/Vue component\n- `api` — REST API endpoint\n- `model` — Data model + migrations\n- `test` — Unit test suite\n\n## Customization\n\nEdit templates in `{baseDir}/templates/` to match your coding style.\n\n## Output\n\nFiles are written to the current working directory.'
  },
  data: {
    name: 'data-analyzer',
    desc: 'Analyze, visualize, and summarize datasets. Use when the user asks to explore data, compute statistics, find patterns, generate charts, or produce data reports.',
    instructions: '# Data Analyzer\n\n## Quick Start\n\n```bash\n{baseDir}/scripts/analyze.sh data.csv --summary\n```\n\n## Operations\n\n- `--summary` — Descriptive statistics\n- `--correlate` — Correlation matrix\n- `--plot` — Generate charts (requires matplotlib)\n- `--outliers` — Detect anomalies\n\n## Output Formats\n\nJSON, Markdown table, or HTML report.\n\n## Notes\n\nFor large datasets (>1M rows), use `--sample 10000` first.'
  },
  auto: {
    name: 'task-automator',
    desc: 'Automate repetitive tasks, workflows, and system operations. Use when the user asks to schedule jobs, run batch operations, automate system tasks, or create workflow pipelines.',
    instructions: '# Task Automator\n\n## Quick Start\n\n```bash\n{baseDir}/scripts/automate.sh --task daily-backup\n```\n\n## Available Tasks\n\n- `daily-backup` — Backup files to remote\n- `cleanup` — Remove temp files older than 7 days\n- `sync` — Sync directories\n- `notify` — Send status notifications\n\n## Scheduling\n\nAdd to cron:\n```bash\n0 2 * * * {baseDir}/scripts/automate.sh --task daily-backup\n```\n\n## Logs\n\nAll runs logged to `~/.local/share/automator/logs/`'
  },
  media: {
    name: 'media-handler',
    desc: 'Process images, videos, and audio files. Use when the user asks to resize images, convert video formats, extract audio, generate thumbnails, or apply media transformations.',
    instructions: '# Media Handler\n\n## Quick Start\n\n```bash\n# Resize image\n{baseDir}/scripts/media.sh resize input.jpg --width 800\n\n# Convert video\n{baseDir}/scripts/media.sh convert input.mp4 --format webm\n```\n\n## Operations\n\n- `resize` — Resize images (maintains aspect ratio)\n- `convert` — Convert between formats\n- `thumbnail` — Generate thumbnails\n- `extract-audio` — Pull audio from video\n- `compress` — Reduce file size\n\n## Dependencies\n\nRequires: `ffmpeg`, `imagemagick`\n\n```bash\napt install ffmpeg imagemagick\n```'
  }
};

var state = {
  step: 1,
  name: '',
  desc: '',
  triggers: [],
  instructions: '',
  activeTab: 'scripts',
  resources: { scripts: [], references: [], assets: [] },
  activeTpl: null
};

function injectStyles() {
  if (document.getElementById('sf-styles')) return;
  var s = document.createElement('style');
  s.id = 'sf-styles';
  s.textContent = '.sf-overlay{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.7);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center}.sf-card{width:95%;max-width:700px;max-height:85vh;overflow-y:auto;background:rgba(30,30,32,.98);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px;color:#fff;font-family:system-ui}.sf-progress{display:flex;gap:8px;justify-content:center;margin-bottom:24px}.sf-progress-dot{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.15);transition:all 200ms;cursor:default}.sf-progress-dot.active{background:#007AFF;transform:scale(1.2)}.sf-progress-dot.done{background:#4ade80}.sf-step h2{margin:0 0 8px;font-size:20px}.sf-hint{font-size:13px;opacity:.5;margin:0 0 12px}.sf-input,.sf-textarea,.sf-select{width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-size:14px;margin-bottom:12px;box-sizing:border-box}.sf-textarea{font-family:monospace;resize:vertical}.sf-code-editor{font-family:"SF Mono",monospace;font-size:12px;line-height:1.6}.sf-btn{padding:10px 20px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#fff;cursor:pointer;font-size:13px}.sf-btn:hover{background:rgba(255,255,255,.08)}.sf-btn-primary{background:#007AFF;border-color:transparent}.sf-btn-primary:hover{background:#0066DD}.sf-btn-small{padding:6px 12px;font-size:12px}.sf-nav{display:flex;justify-content:space-between;margin-top:24px}.sf-suggestions{background:rgba(255,255,255,.04);border-radius:10px;padding:12px 16px;margin-top:12px}.sf-suggestion-label{font-size:12px;font-weight:600;opacity:.6}.sf-suggestions ul{margin:6px 0 0;padding-left:16px;font-size:12px;opacity:.6}.sf-pill{padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#fff;cursor:pointer;font-size:12px;margin:4px}.sf-pill:hover{background:rgba(255,255,255,.1)}.sf-pill.active{background:rgba(0,122,255,.2);border-color:#007AFF}.sf-template-pills{display:flex;flex-wrap:wrap;margin-top:8px}.sf-trigger-item{display:flex;align-items:center;gap:8px;padding:6px 12px;margin:4px 0;background:rgba(255,255,255,.06);border-radius:8px;font-size:13px}.sf-trigger-remove{background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px;line-height:1}.sf-add-trigger{display:flex;gap:8px;align-items:flex-start}.sf-add-trigger .sf-input{margin-bottom:0}.sf-res-tab{padding:8px 16px;border:none;background:transparent;color:rgba(255,255,255,.5);cursor:pointer;font-size:13px;border-bottom:2px solid transparent}.sf-res-tab.active{color:#fff;border-bottom-color:#007AFF}.sf-resource-list{margin:12px 0}.sf-resource-item{display:flex;align-items:center;gap:8px;padding:8px;background:rgba(255,255,255,.04);border-radius:8px;margin:4px 0;font-size:13px;font-family:monospace}.sf-resource-remove{background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px}.sf-preview{background:rgba(255,255,255,.04);border-radius:12px;padding:16px}.sf-preview-header{display:flex;justify-content:space-between;margin-bottom:12px;font-size:14px;font-weight:600}.sf-preview-tree{font-family:monospace;font-size:12px;opacity:.6;margin-bottom:16px;white-space:pre}.sf-preview-content{font-family:monospace;font-size:12px;white-space:pre-wrap;max-height:300px;overflow-y:auto;opacity:.8}.sf-actions{display:flex;gap:12px;margin-top:16px}.sf-editor-toolbar{display:flex;gap:4px;margin-bottom:8px}.sf-tb-btn{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:transparent;color:#fff;cursor:pointer;font-size:11px;font-family:monospace}.sf-template-section{margin-top:16px}.sf-close-btn{position:absolute;top:16px;right:20px;background:none;border:none;color:rgba(255,255,255,.4);font-size:20px;cursor:pointer;line-height:1}.sf-card{position:relative}';
  document.head.appendChild(s);
}

function buildSkillMd() {
  var md = '# ' + (state.name || 'my-skill') + '\n\n';
  if (state.desc) md += '## Description\n\n' + state.desc + '\n\n';
  if (state.triggers.length) {
    md += '## Triggers\n\n';
    for (var i = 0; i < state.triggers.length; i++) md += '- ' + state.triggers[i] + '\n';
    md += '\n';
  }
  if (state.instructions) md += state.instructions;
  return md;
}

function buildPreviewTree() {
  var name = state.name || 'my-skill';
  var lines = [name + '/','├── SKILL.md'];
  var cats = ['scripts','references','assets'];
  for (var c = 0; c < cats.length; c++) {
    var cat = cats[c];
    if (state.resources[cat].length) {
      lines.push('├── ' + cat + '/');
      for (var f = 0; f < state.resources[cat].length; f++) {
        lines.push('│   └── ' + state.resources[cat][f].name);
      }
    }
  }
  return lines.join('\n');
}

function totalFiles() {
  var n = 1;
  var cats = ['scripts','references','assets'];
  for (var c = 0; c < cats.length; c++) n += state.resources[cats[c]].length;
  return n;
}

function renderProgress(el) {
  var html = '<div class="sf-progress">';
  for (var i = 1; i <= 5; i++) {
    var cls = i === state.step ? 'active' : (i < state.step ? 'done' : '');
    html += '<div class="sf-progress-dot ' + cls + '"></div>';
  }
  html += '</div>';
  return html;
}

function renderTriggers() {
  var html = '';
  for (var i = 0; i < state.triggers.length; i++) {
    html += '<div class="sf-trigger-item"><span>' + escHtml(state.triggers[i]) + '</span><button class="sf-trigger-remove" data-idx="' + i + '">×</button></div>';
  }
  return html || '<p style="font-size:12px;opacity:0.4;">No triggers yet. Add phrases below.</p>';
}

function renderResourceList() {
  var items = state.resources[state.activeTab];
  var html = '';
  for (var i = 0; i < items.length; i++) {
    html += '<div class="sf-resource-item"><span style="flex:1">' + escHtml(items[i].name) + '</span><button class="sf-resource-remove" data-tab="' + state.activeTab + '" data-idx="' + i + '">×</button></div>';
  }
  return html || '<p style="font-size:12px;opacity:0.4;">No files in this category yet.</p>';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderStep() {
  var s = state.step;
  if (s === 1) return '<div class="sf-step" data-step="1"><h2>🏷️ Name Your Skill</h2><p class="sf-hint">Choose a short, descriptive name. Use lowercase + hyphens.</p><input class="sf-input" id="sfName" placeholder="e.g. pdf-editor, slack-notifier" value="' + escHtml(state.name) + '" /><p class="sf-hint">Describe what it does and when to use it. Be specific — this is how the AI decides when to activate your skill.</p><textarea class="sf-textarea" id="sfDesc" rows="4" placeholder="e.g. Generate and edit PDF documents. Use when the user asks to create invoices, reports, or modify existing PDFs.">' + escHtml(state.desc) + '</textarea><div class="sf-suggestions"><span class="sf-suggestion-label">💡 Tips (from skill engineering best practices):</span><ul><li>Include both what it does AND when to trigger — this is the primary trigger mechanism</li><li>Mention specific keywords users might say</li><li>Only name + description are stored in agent memory (progressive disclosure)</li><li>Think of it like software engineering for AI agents — UX, context engineering, edge cases</li></ul></div></div>';
  if (s === 2) return '<div class="sf-step" data-step="2"><h2>🎯 Trigger Design</h2><p class="sf-hint">What should the user say to activate this skill? Add example phrases.</p><div class="sf-triggers" id="sfTriggers">' + renderTriggers() + '</div><div class="sf-add-trigger"><input class="sf-input" id="sfTriggerInput" placeholder="e.g. \'Create a PDF report\'" /><button class="sf-btn sf-btn-small" id="sfAddTrigger">+ Add</button></div><div class="sf-template-section"><span class="sf-suggestion-label">📋 Template Categories:</span><div class="sf-template-pills"><button class="sf-pill' + (state.activeTpl==='api'?' active':'') + '" data-tpl="api">API Integration</button><button class="sf-pill' + (state.activeTpl==='file'?' active':'') + '" data-tpl="file">File Processing</button><button class="sf-pill' + (state.activeTpl==='code'?' active':'') + '" data-tpl="code">Code Generation</button><button class="sf-pill' + (state.activeTpl==='data'?' active':'') + '" data-tpl="data">Data Analysis</button><button class="sf-pill' + (state.activeTpl==='auto'?' active':'') + '" data-tpl="auto">Automation</button><button class="sf-pill' + (state.activeTpl==='media'?' active':'') + '" data-tpl="media">Media/Content</button></div></div></div>';
  if (s === 3) return '<div class="sf-step" data-step="3"><h2>📝 Instructions</h2><p class="sf-hint">Write the skill instructions in Markdown. This is what the AI reads when your skill activates.</p><div class="sf-editor-toolbar"><button class="sf-tb-btn" data-insert="## ">H2</button><button class="sf-tb-btn" data-insert="### ">H3</button><button class="sf-tb-btn" data-insert="```bash\n\n```">Code</button><button class="sf-tb-btn" data-insert="- ">List</button><button class="sf-tb-btn" data-insert="**">Bold</button></div><textarea class="sf-textarea sf-code-editor" id="sfInstructions" rows="15" placeholder="# My Skill&#10;&#10;## Quick Start&#10;&#10;...">' + escHtml(state.instructions) + '</textarea><div class="sf-suggestions"><span class="sf-suggestion-label">💡 Framework (Ben AI method):</span><ul><li><b>Goal:</b> Define the objective briefly (deep detail goes in steps)</li><li><b>Tools/MCPs:</b> List connectors, APIs, software the agent needs</li><li><b>Step-by-step process:</b> What to do, human-in-the-loop points, what context to load per step</li><li><b>Output per step:</b> Offer multiple variations for user to choose from</li><li><b>Rules:</b> Predict failure modes, enforce reference file usage</li><li><b>Progressive updates:</b> Auto-save approved outputs as examples, auto-update rules on rejection</li><li>Keep SKILL.md clean (process only) — additional context → reference files</li></ul></div></div>';
  if (s === 4) return '<div class="sf-step" data-step="4"><h2>📦 Resources</h2><p class="sf-hint">Add scripts, reference docs, or assets. Optional — many skills only need instructions.</p><div class="sf-resource-tabs"><button class="sf-res-tab' + (state.activeTab==='scripts'?' active':'') + '" data-res="scripts">📜 Scripts</button><button class="sf-res-tab' + (state.activeTab==='references'?' active':'') + '" data-res="references">📚 References</button><button class="sf-res-tab' + (state.activeTab==='assets'?' active':'') + '" data-res="assets">🎨 Assets</button></div><div class="sf-resource-body"><div class="sf-resource-list" id="sfResourceList">' + renderResourceList() + '</div><div class="sf-resource-add"><input class="sf-input" id="sfFileName" placeholder="filename.sh" /><textarea class="sf-textarea sf-code-editor" id="sfFileContent" rows="8" placeholder="#!/bin/bash&#10;# Your script here"></textarea><button class="sf-btn" id="sfAddFile">+ Add File</button></div></div></div>';
  if (s === 5) { var md = buildSkillMd(); return '<div class="sf-step" data-step="5"><h2>✨ Preview & Download</h2><div class="sf-preview"><div class="sf-preview-header"><span class="sf-preview-name">' + escHtml(state.name||'my-skill') + '</span><span class="sf-preview-files">' + totalFiles() + ' file' + (totalFiles()!==1?'s':'') + '</span></div><div class="sf-preview-tree" id="sfPreviewTree">' + escHtml(buildPreviewTree()) + '</div><div class="sf-preview-content" id="sfPreviewContent">' + escHtml(md) + '</div></div><div class="sf-actions"><button class="sf-btn sf-btn-primary" id="sfDownload">📥 Download .skill</button><button class="sf-btn" id="sfCopyMd">📋 Copy SKILL.md</button></div></div>'; }
}

function renderNav() {
  var back = state.step > 1 ? '<button class="sf-btn" id="sfBack">← Back</button>' : '<span></span>';
  var next = state.step < 5 ? '<button class="sf-btn sf-btn-primary" id="sfNext">Next →</button>' : '<button class="sf-btn sf-btn-primary" id="sfDownload2">📥 Download</button>';
  return '<div class="sf-nav">' + back + next + '</div>';
}

function saveCurrentStep() {
  var s = state.step;
  if (s === 1) {
    var n = document.getElementById('sfName'); if (n) state.name = n.value.trim();
    var d = document.getElementById('sfDesc'); if (d) state.desc = d.value.trim();
  }
  if (s === 3) {
    var ins = document.getElementById('sfInstructions'); if (ins) state.instructions = ins.value;
  }
}

function loadJSZip(cb) {
  if (window.JSZip) { cb(); return; }
  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  script.onload = cb;
  document.head.appendChild(script);
}

function doDownload() {
  saveCurrentStep();
  loadJSZip(function() {
    var zip = new window.JSZip();
    var name = state.name || 'my-skill';
    var folder = zip.folder(name);
    folder.file('SKILL.md', buildSkillMd());
    var cats = ['scripts','references','assets'];
    for (var c = 0; c < cats.length; c++) {
      var cat = cats[c];
      if (state.resources[cat].length) {
        var sub = folder.folder(cat);
        for (var f = 0; f < state.resources[cat].length; f++) {
          sub.file(state.resources[cat][f].name, state.resources[cat][f].content);
        }
      }
    }
    zip.generateAsync({type:'blob'}).then(function(blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name + '.skill';
      a.click();
      setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
    });
  });
}

function attachEvents(overlay) {
  overlay.addEventListener('click', function(e) {
    var t = e.target;

    if (t.id === 'sfBack') { saveCurrentStep(); state.step--; refresh(overlay); return; }
    if (t.id === 'sfNext') { saveCurrentStep(); state.step++; refresh(overlay); return; }
    if (t.id === 'sfDownload' || t.id === 'sfDownload2') { doDownload(); return; }

    if (t.id === 'sfAddTrigger') {
      var inp = document.getElementById('sfTriggerInput');
      if (inp && inp.value.trim()) { state.triggers.push(inp.value.trim()); inp.value = ''; var trig = document.getElementById('sfTriggers'); if (trig) trig.innerHTML = renderTriggers(); attachTriggerRemove(overlay); }
      return;
    }
    if (t.classList.contains('sf-trigger-remove')) {
      state.triggers.splice(parseInt(t.getAttribute('data-idx'),10), 1);
      var trigEl = document.getElementById('sfTriggers'); if (trigEl) trigEl.innerHTML = renderTriggers(); attachTriggerRemove(overlay); return;
    }

    if (t.classList.contains('sf-pill')) {
      var tpl = t.getAttribute('data-tpl');
      if (tpl && TEMPLATES[tpl]) {
        state.activeTpl = tpl;
        var td = TEMPLATES[tpl];
        state.name = td.name; state.desc = td.desc; state.instructions = td.instructions;
        if (!state.triggers.length) state.triggers = ['Use ' + td.name.replace(/-/g,' ')];
        refresh(overlay);
      }
      return;
    }

    if (t.classList.contains('sf-res-tab')) {
      state.activeTab = t.getAttribute('data-res');
      var tabs = overlay.querySelectorAll('.sf-res-tab');
      for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-res') === state.activeTab);
      var rl = document.getElementById('sfResourceList'); if (rl) rl.innerHTML = renderResourceList();
      return;
    }

    if (t.id === 'sfAddFile') {
      var fn = document.getElementById('sfFileName'); var fc = document.getElementById('sfFileContent');
      if (fn && fn.value.trim()) {
        state.resources[state.activeTab].push({name: fn.value.trim(), content: fc ? fc.value : ''});
        fn.value = ''; if (fc) fc.value = '';
        var rl2 = document.getElementById('sfResourceList'); if (rl2) rl2.innerHTML = renderResourceList();
      }
      return;
    }
    if (t.classList.contains('sf-resource-remove')) {
      var tab = t.getAttribute('data-tab'); var idx = parseInt(t.getAttribute('data-idx'),10);
      state.resources[tab].splice(idx, 1);
      var rl3 = document.getElementById('sfResourceList'); if (rl3) rl3.innerHTML = renderResourceList(); return;
    }

    if (t.id === 'sfCopyMd') { saveCurrentStep(); if (navigator.clipboard) navigator.clipboard.writeText(buildSkillMd()); return; }

    if (t.classList.contains('sf-tb-btn')) {
      var ins2 = document.getElementById('sfInstructions'); if (!ins2) return;
      var txt = t.getAttribute('data-insert'); var start = ins2.selectionStart; var end = ins2.selectionEnd;
      var val = ins2.value; ins2.value = val.slice(0,start) + txt + val.slice(end);
      ins2.selectionStart = ins2.selectionEnd = start + txt.length; ins2.focus(); return;
    }

    if (t.classList.contains('sf-close-btn') || t === overlay) { SkillForge.close(); }
  });

  overlay.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') SkillForge.close();
    if (e.key === 'Enter' && e.target.id === 'sfTriggerInput') {
      var btn = document.getElementById('sfAddTrigger'); if (btn) btn.click(); e.preventDefault();
    }
  });
}

function attachTriggerRemove(overlay) {}

function refresh(overlay) {
  var card = overlay.querySelector('.sf-card');
  card.innerHTML = '<button class="sf-close-btn" title="Close">✕</button>' + renderProgress() + renderStep() + renderNav();
}

function createOverlay() {
  var overlay = document.createElement('div');
  overlay.className = 'sf-overlay';
  overlay.id = 'sf-overlay';
  var card = document.createElement('div');
  card.className = 'sf-card';
  overlay.appendChild(card);
  attachEvents(overlay);
  return overlay;
}

var SkillForge = {
  open: function() {
    if (document.getElementById('sf-overlay')) return;
    injectStyles();
    state = { step:1, name:'', desc:'', triggers:[], instructions:'', activeTab:'scripts', resources:{scripts:[],references:[],assets:[]}, activeTpl:null };
    var overlay = createOverlay();
    refresh(overlay);
    document.body.appendChild(overlay);
    var firstInput = overlay.querySelector('.sf-input');
    if (firstInput) setTimeout(function() { firstInput.focus(); }, 50);
  },
  close: function() {
    var el = document.getElementById('sf-overlay');
    if (el) el.parentNode.removeChild(el);
  }
};

window.SkillForge = SkillForge;
})();
