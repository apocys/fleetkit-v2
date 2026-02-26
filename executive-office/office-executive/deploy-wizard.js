(function() {
  var overlay = null;

  function injectStyles() {
    if (document.getElementById('dw-styles')) return;
    var s = document.createElement('style');
    s.id = 'dw-styles';
    s.textContent = [
      '.dw-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}',
      '.dw-container{background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:20px;max-width:800px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.6)}',
      '.dw-header{padding:32px 32px 0;position:relative}',
      '.dw-header h2{margin:0 0 8px;font-size:26px;font-weight:700;color:#fff}',
      '.dw-header p{margin:0;color:rgba(255,255,255,0.55);font-size:15px}',
      '.dw-close{position:absolute;top:0;right:32px;background:rgba(255,255,255,0.08);border:none;color:#fff;font-size:20px;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s}',
      '.dw-close:hover{background:rgba(255,255,255,0.18)}',
      '.dw-paths{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:28px 32px 32px}',
      '.dw-path-card{background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;cursor:pointer;transition:border-color 0.2s,background 0.2s,box-shadow 0.2s}',
      '.dw-path-card:hover{border-color:#007AFF;background:rgba(0,122,255,0.08);box-shadow:0 0 0 3px rgba(0,122,255,0.15)}',
      '.dw-path-icon{font-size:32px;margin-bottom:12px}',
      '.dw-path-title{font-size:16px;font-weight:700;color:#fff;margin-bottom:6px}',
      '.dw-path-desc{font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:12px;line-height:1.5}',
      '.dw-path-tag{display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:0.3px}',
      '.dw-tag-green{background:rgba(52,199,89,0.18);color:#34c759}',
      '.dw-tag-blue{background:rgba(0,122,255,0.18);color:#5ac8fa}',
      '.dw-tag-orange{background:rgba(255,159,10,0.18);color:#ff9f0a}',
      '.dw-tag-purple{background:rgba(175,82,222,0.18);color:#af52de}',
      '.dw-detail{padding:28px 32px 32px}',
      '.dw-back{background:rgba(255,255,255,0.07);border:none;color:rgba(255,255,255,0.7);font-size:13px;padding:8px 16px;border-radius:10px;cursor:pointer;margin-bottom:24px;transition:background 0.2s}',
      '.dw-back:hover{background:rgba(255,255,255,0.13)}',
      '.dw-detail-title{font-size:20px;font-weight:700;color:#fff;margin:0 0 6px}',
      '.dw-detail-sub{font-size:14px;color:rgba(255,255,255,0.5);margin:0 0 24px}',
      '.dw-input{width:100%;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.1);border-radius:12px;color:#fff;font-size:14px;padding:12px 16px;box-sizing:border-box;margin-bottom:12px;outline:none;transition:border-color 0.2s}',
      '.dw-input:focus{border-color:#007AFF}',
      '.dw-input::placeholder{color:rgba(255,255,255,0.3)}',
      '.dw-btn{display:inline-block;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:opacity 0.2s,transform 0.1s}',
      '.dw-btn:active{transform:scale(0.97)}',
      '.dw-btn-primary{background:#007AFF;color:#fff}',
      '.dw-btn-primary:hover{opacity:0.88}',
      '.dw-btn-secondary{background:rgba(255,255,255,0.1);color:#fff}',
      '.dw-btn-secondary:hover{background:rgba(255,255,255,0.16)}',
      '.dw-dl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}',
      '.dw-dl-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px 16px;text-align:center}',
      '.dw-dl-icon{font-size:28px;margin-bottom:8px}',
      '.dw-dl-label{font-size:13px;font-weight:600;color:#fff;margin-bottom:6px}',
      '.dw-dl-cs{font-size:11px;font-weight:600;background:rgba(255,159,10,0.18);color:#ff9f0a;padding:3px 10px;border-radius:20px;display:inline-block}',
      '.dw-msg{padding:14px 16px;border-radius:12px;font-size:14px;margin-bottom:12px}',
      '.dw-msg-success{background:rgba(52,199,89,0.12);border:1px solid rgba(52,199,89,0.3);color:#34c759}',
      '.dw-msg-error{background:rgba(255,69,58,0.12);border:1px solid rgba(255,69,58,0.3);color:#ff453a}',
      '.dw-msg-info{background:rgba(255,159,10,0.1);border:1px solid rgba(255,159,10,0.25);color:#ff9f0a}',
      '.dw-preview{font-size:13px;color:#5ac8fa;margin-bottom:12px;min-height:20px}',
      '.dw-label{font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}',
      '.dw-section{margin-bottom:18px}',
      '.dw-row{display:flex;gap:10px;align-items:center}',
      '.dw-link{color:#5ac8fa;font-size:12px;text-decoration:none}',
      '.dw-link:hover{text-decoration:underline}',
      '.dw-waitlist-wrap{margin-top:20px}',
      '.dw-waitlist-wrap .dw-row{margin-top:8px}',
      '@media(max-width:600px){.dw-paths{grid-template-columns:1fr}.dw-dl-grid{grid-template-columns:1fr}.dw-header,.dw-detail{padding-left:20px;padding-right:20px}.dw-paths{padding-left:20px;padding-right:20px}}'
    ].join('');
    document.head.appendChild(s);
  }

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function buildPaths() {
    var cards = [
      { path:'demo',    icon:'🖥️',  title:'Try the Demo',        desc:'Explore the live instance right now. No account needed.', tag:'No setup',    tagCls:'dw-tag-green' },
      { path:'desktop', icon:'💻',  title:'Download Desktop App', desc:'Native app for macOS, Windows, and Linux.',                tag:'Coming soon', tagCls:'dw-tag-orange' },
      { path:'connect', icon:'🌐',  title:'Connect Your Instance',desc:'Already running OpenClaw? Link it to this dashboard.',     tag:'Recommended', tagCls:'dw-tag-blue' },
      { path:'deploy',  icon:'🚀',  title:'One-Click Deploy',     desc:'Spin up your own SpawnKit server on Hetzner in 90 seconds.',tag:'Powered by Hetzner',tagCls:'dw-tag-purple' }
    ];
    var grid = el('div', {class:'dw-paths', id:'dwPaths'});
    cards.forEach(function(c) {
      var card = el('div', {class:'dw-path-card', 'data-path':c.path});
      card.innerHTML = '<div class="dw-path-icon">'+c.icon+'</div><div class="dw-path-title">'+c.title+'</div><div class="dw-path-desc">'+c.desc+'</div><div class="dw-path-tag '+c.tagCls+'">'+c.tag+'</div>';
      card.addEventListener('click', function() { showDetail(c.path); });
      grid.appendChild(card);
    });
    return grid;
  }

  function showDetail(path) {
    var paths = overlay.querySelector('#dwPaths');
    var detail = overlay.querySelector('#dwDetail');
    paths.style.display = 'none';
    detail.style.display = 'block';
    detail.innerHTML = '';
    var back = el('button', {class:'dw-back'}, '← Back');
    back.addEventListener('click', function() { paths.style.display = 'grid'; detail.style.display = 'none'; });
    detail.appendChild(back);
    if (path === 'demo') renderDemo(detail);
    else if (path === 'desktop') renderDesktop(detail);
    else if (path === 'connect') renderConnect(detail);
    else if (path === 'deploy') renderDeploy(detail);
  }

  function renderDemo(d) {
    d.appendChild(el('h3', {class:'dw-detail-title'}, '🖥️ You\'re already here!'));
    d.appendChild(el('p', {class:'dw-detail-sub'}, 'Explore the SpawnKit dashboard — your AI team is ready to go.'));
    var msg = el('div', {class:'dw-msg dw-msg-success'}, '✅ This is the live demo. No setup required. Click around and explore!');
    d.appendChild(msg);
    var btn = el('button', {class:'dw-btn dw-btn-primary'}, 'Start Exploring →');
    btn.addEventListener('click', window.DeployWizard.close);
    d.appendChild(btn);
  }

  function renderDesktop(d) {
    d.appendChild(el('h3', {class:'dw-detail-title'}, '💻 Download Desktop App'));
    d.appendChild(el('p', {class:'dw-detail-sub'}, 'A native SpawnKit experience for your machine.'));
    var grid = el('div', {class:'dw-dl-grid'});
    [['🍎','macOS','.dmg'],['🪟','Windows','.exe'],['🐧','Linux','.AppImage']].forEach(function(p) {
      var c = el('div', {class:'dw-dl-card'});
      c.innerHTML = '<div class="dw-dl-icon">'+p[0]+'</div><div class="dw-dl-label">'+p[1]+'</div><div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:8px">'+p[2]+'</div><div class="dw-dl-cs">Coming Soon</div>';
      grid.appendChild(c);
    });
    d.appendChild(grid);
    var wrap = el('div', {class:'dw-waitlist-wrap'});
    wrap.appendChild(el('div', {class:'dw-label'}, 'Get notified when it launches'));
    var row = el('div', {class:'dw-row'});
    var inp = el('input', {class:'dw-input', type:'email', placeholder:'your@email.com', style:'margin-bottom:0;flex:1'});
    var btn = el('button', {class:'dw-btn dw-btn-primary'}, 'Notify me');
    btn.addEventListener('click', function() {
      if (inp.value) { localStorage.setItem('spawnkit-desktop-waitlist', inp.value); btn.textContent = '✓ Saved!'; btn.disabled = true; }
    });
    row.appendChild(inp); row.appendChild(btn);
    wrap.appendChild(row);
    d.appendChild(wrap);
  }

  function renderConnect(d) {
    d.appendChild(el('h3', {class:'dw-detail-title'}, '🌐 Connect Your Instance'));
    d.appendChild(el('p', {class:'dw-detail-sub'}, 'Already running OpenClaw? Point this dashboard at your server.'));
    var urlInp = el('input', {class:'dw-input', type:'url', placeholder:'https://your-server:8765', id:'dwConnUrl'});
    urlInp.value = localStorage.getItem('spawnkit-instance-url') || '';
    var tokInp = el('input', {class:'dw-input', type:'password', placeholder:'your-api-token', id:'dwConnTok'});
    tokInp.value = localStorage.getItem('spawnkit-api-token') || '';
    var status = el('div');
    var btn = el('button', {class:'dw-btn dw-btn-primary'}, 'Test Connection');
    btn.addEventListener('click', function() {
      var url = urlInp.value.trim().replace(/\/$/, '');
      var tok = tokInp.value.trim();
      if (!url) { status.innerHTML = '<div class="dw-msg dw-msg-error">❌ Please enter a URL.</div>'; return; }
      btn.textContent = 'Testing…'; btn.disabled = true; status.innerHTML = '';
      console.log('[DeployWizard] Testing connection to:', url);
      fetch(url + '/api/oc/sessions', { headers: tok ? { Authorization: 'Bearer ' + tok } : {}, signal: AbortSignal.timeout(7000) })
        .then(function(r) {
          console.log('[DeployWizard] Response status:', r.status);
          if (r.status === 401 || r.status === 403) {
            throw new Error('Authentication failed (HTTP ' + r.status + '). Check your API token.');
          }
          if (!r.ok) { throw new Error('HTTP ' + r.status); }
          return r.json().then(function(data) {
            // Validate it's actually an OpenClaw response (must be an array of sessions)
            if (!Array.isArray(data)) {
              console.error('[DeployWizard] Invalid response — not an array:', data);
              throw new Error('Server responded but doesn\'t look like OpenClaw (expected session array).');
            }
            console.log('[DeployWizard] ✅ Valid OpenClaw instance, sessions:', data.length);
            localStorage.setItem('spawnkit-instance-url', url);
            localStorage.setItem('spawnkit-api-token', tok);
            localStorage.setItem('spawnkit-token', tok); // Also set for auth.js
            status.innerHTML = '<div class="dw-msg dw-msg-success">✅ Connected! ' + data.length + ' sessions found. Reloading…</div>';
            setTimeout(function() { location.reload(); }, 1200);
          });
        })
        .catch(function(e) {
          console.error('[DeployWizard] Connection failed:', e.message);
          status.innerHTML = '<div class="dw-msg dw-msg-error">❌ ' + e.message + '</div>';
          btn.textContent = 'Test Connection'; btn.disabled = false;
        });
    });
    d.appendChild(el('div', {class:'dw-label'}, 'OpenClaw API URL'));
    d.appendChild(urlInp);
    d.appendChild(el('div', {class:'dw-label'}, 'API Token'));
    d.appendChild(tokInp);
    d.appendChild(btn);
    d.appendChild(status);
  }

  function renderDeploy(d) {
    d.appendChild(el('h3', {class:'dw-detail-title'}, '🚀 One-Click Deploy'));
    d.appendChild(el('p', {class:'dw-detail-sub'}, 'Deploy your own SpawnKit server on Hetzner Cloud in ~90 seconds.'));
    var sec1 = el('div', {class:'dw-section'});
    sec1.appendChild(el('div', {class:'dw-label'}, 'Step 1 — Hetzner API Token'));
    var hRow = el('div', {style:'position:relative'});
    var hInp = el('input', {class:'dw-input', type:'password', placeholder:'hv1-xxxxxxxxxxxx'});
    hRow.appendChild(hInp);
    hRow.appendChild(el('div', {style:'margin-top:4px'}, '<a class="dw-link" href="https://console.hetzner.cloud" target="_blank">Get your token at console.hetzner.cloud ↗</a>'));
    sec1.appendChild(hRow);
    var sec2 = el('div', {class:'dw-section'});
    sec2.appendChild(el('div', {class:'dw-label'}, 'Step 2 — Choose a username'));
    var uInp = el('input', {class:'dw-input', type:'text', placeholder:'yourname (3–20 chars, lowercase)'});
    var uPrev = el('div', {class:'dw-preview'});
    uInp.addEventListener('input', function() {
      var v = uInp.value.trim();
      uPrev.textContent = v ? 'Your instance: ' + v + '.spawnkit.ai' : '';
    });
    sec2.appendChild(uInp);
    sec2.appendChild(uPrev);
    var sec3 = el('div', {class:'dw-section'});
    sec3.appendChild(el('div', {class:'dw-label'}, 'Step 3 — Server location'));
    var sel = el('select', {class:'dw-input', style:'cursor:pointer'});
    [['fsn1','Falkenstein, Germany'],['nbg1','Nuremberg, Germany'],['hel1','Helsinki, Finland'],['ash','Ashburn, Virginia']].forEach(function(o) {
      sel.appendChild(el('option', {value:o[0]}, o[1]));
    });
    sec3.appendChild(sel);
    var deployBtn = el('button', {class:'dw-btn dw-btn-primary'}, '🚀 Deploy Now');
    var comingSoon = el('div');
    deployBtn.addEventListener('click', function() {
      deployBtn.style.display = 'none';
      comingSoon.innerHTML = '<div class="dw-msg dw-msg-info">🚧 One-Click Deploy is coming soon! Join the waitlist and we\'ll notify you the moment it launches.</div><div class="dw-waitlist-wrap"><div class="dw-label">Your email</div><div class="dw-row"><input class="dw-input" type="email" placeholder="you@example.com" id="dwDeployEmail" style="margin-bottom:0;flex:1"><button class="dw-btn dw-btn-primary" id="dwDeployNotify">Notify me</button></div></div>';
      var nb = comingSoon.querySelector('#dwDeployNotify');
      nb.addEventListener('click', function() {
        var v = comingSoon.querySelector('#dwDeployEmail').value;
        if (v) { localStorage.setItem('spawnkit-deploy-waitlist', v); nb.textContent = '✓ You\'re on the list!'; nb.disabled = true; }
      });
    });
    d.appendChild(sec1); d.appendChild(sec2); d.appendChild(sec3);
    d.appendChild(deployBtn); d.appendChild(comingSoon);
  }

  function buildOverlay() {
    var ov = el('div', {class:'dw-overlay', id:'dwOverlay'});
    var container = el('div', {class:'dw-container'});
    var header = el('div', {class:'dw-header'});
    header.innerHTML = '<h2>🚀 Get Started with SpawnKit</h2><p>Choose how you want to run your AI team</p>';
    var closeBtn = el('button', {class:'dw-close'}, '×');
    closeBtn.addEventListener('click', window.DeployWizard.close);
    header.appendChild(closeBtn);
    var detail = el('div', {class:'dw-detail', id:'dwDetail', style:'display:none'});
    container.appendChild(header);
    container.appendChild(buildPaths());
    container.appendChild(detail);
    ov.appendChild(container);
    ov.addEventListener('click', function(e) { if (e.target === ov) window.DeployWizard.close(); });
    return ov;
  }

  function onKeyDown(e) { if (e.key === 'Escape') window.DeployWizard.close(); }

  window.DeployWizard = {
    open: function() {
      if (overlay) return;
      injectStyles();
      overlay = buildOverlay();
      document.body.appendChild(overlay);
      document.addEventListener('keydown', onKeyDown);
    },
    close: function() {
      if (!overlay) return;
      document.removeEventListener('keydown', onKeyDown);
      overlay.parentNode && overlay.parentNode.removeChild(overlay);
      overlay = null;
    }
  };
})();
