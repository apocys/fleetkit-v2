/* ═══════════════════════════════════════════════════════════════
   SpawnKit Shared Panels — Universal 18-Feature Implementation
   Extracted from Executive theme for use across all 4 gamified themes
   ═══════════════════════════════════════════════════════════════ */

window.SpawnKitPanels = (function() {
    'use strict';

    var _config = {};
    var _isInitialized = false;

    /* ═══════════════════════════════════════════════════════════════
       DEMO DATA — Realistic fallbacks when no API
       ═══════════════════════════════════════════════════════════════ */
    var DEMO = {
        logs: {
            ceo: [
                {timestamp:Date.now()-120000,role:'system',text:'Session initialized — claude-opus-4 • thinking: extended'},
                {timestamp:Date.now()-105000,role:'assistant',text:'Reviewing fleet status — 4/6 agents active, 2 sub-agents running'},
                {timestamp:Date.now()-90000,role:'system',text:'Heartbeat check: email clear, calendar clear, TODO.md updated'},
                {timestamp:Date.now()-75000,role:'assistant',text:'Spawning forge-executive-ss-plus for theme polish...'},
                {timestamp:Date.now()-60000,role:'user',text:'On veut du SS+. C\'est le core.'},
                {timestamp:Date.now()-45000,role:'assistant',text:'Roger. Launching parallel Forge instances for Executive + Green Iso'},
                {timestamp:Date.now()-30000,role:'system',text:'Sub-agent forge-executive-ss-plus started (session: 27078f84)'},
                {timestamp:Date.now()-15000,role:'assistant',text:'Checking Sentinel audit queue... 2 pending reviews'},
                {timestamp:Date.now()-5000,role:'system',text:'Memory snapshot saved → memory/2026-02-21.md'},
            ],
            forge: [
                {timestamp:Date.now()-100000,role:'system',text:'Task: Build pixel art office renderer with Pixel Crawler assets'},
                {timestamp:Date.now()-85000,role:'assistant',text:'Loading 47 sprite sheets... All loaded. Initializing 9 rooms.'},
                {timestamp:Date.now()-70000,role:'assistant',text:'A* pathfinding working — tested 33-tile path from CEO office to break room'},
                {timestamp:Date.now()-55000,role:'system',text:'git commit -m "feat(executive): add room gradient backgrounds"'},
                {timestamp:Date.now()-40000,role:'assistant',text:'Fixing 18 UX points from Kira feedback — priority SS+'},
                {timestamp:Date.now()-25000,role:'assistant',text:'Demo data system built: logs, todos, crons, missions, memory all populated'},
                {timestamp:Date.now()-10000,role:'system',text:'Commit f4a46e9: feat(executive): fix all 18 UX points'},
                {timestamp:Date.now()-3000,role:'assistant',text:'Deploying to app.spawnkit.ai via SCP...'},
            ],
            atlas: [
                {timestamp:Date.now()-95000,role:'system',text:'Session start — claude-sonnet-4 • ops coordination'},
                {timestamp:Date.now()-80000,role:'assistant',text:'Syncing FeedCast deployment status with Hetzner worker'},
                {timestamp:Date.now()-65000,role:'assistant',text:'Fleet standup complete: 5 agents active, 1 idle (Echo)'},
                {timestamp:Date.now()-50000,role:'system',text:'Cron "git-auto-push" triggered — 3 repos pushed'},
                {timestamp:Date.now()-35000,role:'assistant',text:'Workflow audit: all CI/CD pipelines green'},
                {timestamp:Date.now()-8000,role:'assistant',text:'Scheduling next fleet standup for Mon 8:00'},
            ],
            hunter: [
                {timestamp:Date.now()-88000,role:'system',text:'Session start — claude-sonnet-4 • revenue analysis'},
                {timestamp:Date.now()-72000,role:'assistant',text:'Stripe dashboard check: $0 MRR (test mode) — 3 products configured'},
                {timestamp:Date.now()-56000,role:'assistant',text:'Analyzing competitor pricing: Cursor ($20/mo), Windsurf ($15/mo)'},
                {timestamp:Date.now()-38000,role:'assistant',text:'FleetKit Pro pricing validated at $49/mo — strong value prop'},
                {timestamp:Date.now()-12000,role:'assistant',text:'Lead pipeline: 47 GitHub stars, 12 Discord members, 3 waitlist signups'},
            ],
            echo: [
                {timestamp:Date.now()-110000,role:'system',text:'Session start — claude-haiku-3.5 • content creation'},
                {timestamp:Date.now()-95000,role:'assistant',text:'Draft: "Meet your AI C-Suite" blog post — 2400 words'},
                {timestamp:Date.now()-60000,role:'assistant',text:'TikTok script ready: 45s hook > problem > demo > CTA'},
                {timestamp:Date.now()-20000,role:'system',text:'Status: idle — awaiting next content brief from CEO'},
            ],
            sentinel: [
                {timestamp:Date.now()-92000,role:'system',text:'Session start — claude-sonnet-4 • security audit'},
                {timestamp:Date.now()-78000,role:'assistant',text:'Scanning executive theme: no XSS vectors, CSP compliant'},
                {timestamp:Date.now()-62000,role:'assistant',text:'Audit: forge-green-iso-polish > PASS (6/6 criteria met)'},
                {timestamp:Date.now()-44000,role:'assistant',text:'Checking API key exposure in git history... CLEAN'},
                {timestamp:Date.now()-20000,role:'system',text:'Fleet security posture: GREEN — all gates passing'},
                {timestamp:Date.now()-5000,role:'assistant',text:'Monitoring active: next scan in 15 min'},
            ]
        },
        logMetrics: {
            ceo:{tokens:'47.2K',model:'opus-4',uptime:'8h23m',tasks:12},
            forge:{tokens:'124.8K',model:'opus-4',uptime:'3h15m',tasks:18},
            atlas:{tokens:'18.3K',model:'sonnet-4',uptime:'6h42m',tasks:8},
            hunter:{tokens:'22.1K',model:'sonnet-4',uptime:'5h18m',tasks:14},
            echo:{tokens:'8.7K',model:'haiku-3.5',uptime:'2h05m',tasks:3},
            sentinel:{tokens:'31.6K',model:'sonnet-4',uptime:'7h50m',tasks:7}
        },
        chatHistory: [
            {role:'user',text:'J\'ai check le theme Executive. Je ne vois pas les logs de l\'agent.',time:'06:45'},
            {role:'system',text:'Compris. Je lance Forge pour fixer les 18 points UX identifies.',time:'06:46'},
            {role:'user',text:'On veut du SS+. C\'est le core.',time:'06:47'},
            {role:'system',text:'Roger. Forge est spawne avec priorite maximale. Les 18 points seront traites en un seul pass.',time:'06:47'},
            {role:'user',text:'Les agents idle — on doit comprendre pourquoi ils sont idle.',time:'06:48'},
            {role:'system',text:'Note. Point #10 — visual idle state avec label, dimming, et timer. C\'est dans le scope.',time:'06:48'},
            {role:'user',text:'OK. Je veux voir le resultat ce matin.',time:'06:50'},
            {role:'system',text:'ETA: 1h. Forge deploiera sur app.spawnkit.ai automatiquement.',time:'06:50'},
        ],
        todos: {
            ceo: [{icon:'🔴',text:'Push Executive to SS+ — Forge working on 18 points',status:'progress'},{icon:'✅',text:'Review Green Iso polish — approved',status:'done'},{icon:'✅',text:'Morning brief 06:30 — completed',status:'done'},{icon:'📋',text:'Review Sentinel audit for executive deploy',status:'pending'},{icon:'📧',text:'Reply to Kira\'s feedback on agent visibility',status:'pending'}],
            forge: [{icon:'🔴',text:'Fix 18 UX points from Kira\'s feedback',status:'progress'},{icon:'⏳',text:'Deploy executive theme to app.spawnkit.ai',status:'pending'},{icon:'✅',text:'Build pixel renderer with Pixel Crawler assets',status:'done'},{icon:'✅',text:'A* pathfinding for Green Iso theme',status:'done'},{icon:'📋',text:'Fix async bugs in data-bridge.js',status:'pending'}],
            atlas: [{icon:'✅',text:'Fleet standup — all agents synced',status:'done'},{icon:'🔴',text:'Monitor FeedCast deployment on Hetzner',status:'progress'},{icon:'⏳',text:'Update fleet/TODO.md with sprint status',status:'pending'},{icon:'📋',text:'Schedule next week\'s cron audit',status:'pending'}],
            hunter: [{icon:'🔴',text:'Finalize FleetKit pricing tiers',status:'progress'},{icon:'✅',text:'Stripe products created (test mode)',status:'done'},{icon:'⏳',text:'Competitor analysis: Cursor vs Windsurf',status:'pending'},{icon:'📋',text:'Draft go-to-market strategy v2',status:'pending'}],
            echo: [{icon:'✅',text:'Blog post draft: "Meet your AI C-Suite"',status:'done'},{icon:'✅',text:'TikTok script: 45s product demo',status:'done'},{icon:'⏳',text:'Awaiting CEO brief for next content batch',status:'pending'}],
            sentinel: [{icon:'✅',text:'Audit: forge-green-iso-polish > PASS',status:'done'},{icon:'🔴',text:'Review executive deploy artifacts',status:'progress'},{icon:'⏳',text:'Scan git history for exposed secrets',status:'pending'},{icon:'📋',text:'Update fleet/audits/ with latest reports',status:'pending'}]
        },
        missions: [
            {name:'forge-executive-ss-plus',parent:'Forge (CTO)',progress:0.78,status:'running',label:'Fixing 18 UX points from Kira feedback',duration:'47m'},
            {name:'forge-green-iso-polish',parent:'Forge (CTO)',progress:1.0,status:'completed',label:'Pixel art polish — all 6 issues resolved',duration:'2h15m'},
            {name:'sentinel-audit-executive',parent:'Sentinel (QA)',progress:0.35,status:'running',label:'Security + quality audit on executive deploy',duration:'12m'},
            {name:'hunter-pricing-analysis',parent:'Hunter (CRO)',progress:1.0,status:'completed',label:'Competitor pricing analysis complete',duration:'55m'},
        ],
        crons: (function(){
            var now=new Date(), crons=[
                {name:'Morning Inspiration',schedule:'Daily 6:30',owner:'CEO',status:'active',icon:'🌅'},
                {name:'Morning Ideas',schedule:'Daily 7:00',owner:'CEO',status:'active',icon:'💡'},
                {name:'Fleet Standup',schedule:'Weekdays 8:00',owner:'Atlas',status:'active',icon:'👥'},
                {name:'Git Auto-Push',schedule:'Every 6h',owner:'System',status:'active',icon:'📦'},
                {name:'FeedCast Digest',schedule:'Daily 9:00',owner:'Atlas',status:'active',icon:'📰'},
                {name:'Security Scan',schedule:'Every 4h',owner:'Sentinel',status:'active',icon:'🛡️'},
                {name:'Memory Cleanup',schedule:'Weekly Sun 3:00',owner:'System',status:'paused',icon:'🧹'},
                {name:'Stripe Metrics',schedule:'Daily 10:00',owner:'Hunter',status:'active',icon:'💳'},
            ];
            crons.forEach(function(c){var n=new Date(now);n.setDate(n.getDate()+1);c.nextRun=n.toISOString();});
            return crons;
        })(),
        mailMessages: [
            {sender:'Kira',color:'#FF2D55',time:'06:47',text:'On veut du SS+. C\'est le core. Les 18 points doivent etre parfaits.',read:false,priority:'urgent',assignedTo:'Forge (CTO)'},
            {sender:'Forge',color:'#FF9F0A',time:'06:52',text:'Point #14 room gradients applied. Moving to demo data system. ETA 45min.',read:false,priority:'normal',assignedTo:null},
            {sender:'Sentinel',color:'#30D158',time:'06:40',text:'Audit report: forge-green-iso-polish passed all 6 quality gates.',read:true,priority:'info',assignedTo:null},
            {sender:'Atlas',color:'#BF5AF2',time:'06:35',text:'Fleet standup complete. 5/6 active. Echo idle — waiting on content brief.',read:true,priority:'normal',assignedTo:null},
            {sender:'Hunter',color:'#FF453A',time:'06:20',text:'Stripe products created in test mode. FleetKit Pro at $49/mo looks strong.',read:true,priority:'info',assignedTo:null},
            {sender:'System',color:'#636366',time:'06:00',text:'Daily backup completed. Memory snapshots: 14 files, 2.3 MB total.',read:true,priority:'info',assignedTo:null},
        ],
        skills: [
            {name:'weather',desc:'Get forecasts',icon:'☁️'},{name:'gog',desc:'Google Workspace',icon:'📧'},{name:'github',desc:'GitHub CLI',icon:'🐙'},{name:'summarize',desc:'Summarize URLs',icon:'📝'},{name:'camsnap',desc:'Camera capture',icon:'📷'},{name:'peekaboo',desc:'macOS UI',icon:'👀'},{name:'blogwatcher',desc:'RSS monitor',icon:'📡'},{name:'nano-pdf',desc:'PDF editing',icon:'📄'},{name:'sag',desc:'ElevenLabs TTS',icon:'🔊'},
        ],
        agentSkills: {
            ceo:['weather','gog','github','summarize','camsnap','peekaboo','sag'],
            forge:['github','summarize','nano-pdf'],
            atlas:['gog','github','blogwatcher','summarize'],
            hunter:['gog','summarize','blogwatcher'],
            echo:['summarize','sag','nano-pdf','camsnap'],
            sentinel:['github','summarize','peekaboo'],
        },
        memory: {
            longTerm:{content:'# MEMORY.md\\n\\n## 🔴 Iron Rules (NEVER BREAK)\\n\\n1. **Sub-agent completes → Sentinel audit spawns SAME TURN.**\\n2. **Sentinel fails → Fix agent spawns SAME TURN.**\\n3. **No deploy without Sentinel approval.**\\n4. **Priority obvious → DECIDE and act.**\\n5. **Never deploy to /tmp/** — persistent paths only.\\n\\n## Fleet Status\\n\\n- **Active:** ApoMac (CEO), Atlas (COO), Forge (CTO), Hunter (CRO), Sentinel (QA)\\n- **Idle:** Echo (CMO) — awaiting content brief\\n- **Infra:** Hetzner n8n worker, FeedCast bot, CLIProxyAPI\\n- **Sprint:** Executive + Green Iso themes → SS+ quality\\n\\n## Key Decisions\\n\\n- **Pricing:** FleetKit Pro $49/mo, Business $149/mo, FeedCast Premium $6.99/mo\\n- **Stack:** OpenClaw + SpawnKit + Electron + webapp\\n- **Voice:** Kira clone via ElevenLabs\\n- **Quality:** SS+ for all customer-facing deliverables\\n\\n## Lessons Learned\\n\\n- Always use PTY for SSH with password auth\\n- Telegram files: copy to media/ dir first\\n- Docker whitelist .dockerignore blocks everything by default\\n- Sentinel reviews catch 40% more issues than self-review',size:2048},
            daily:[
                {date:'2026-02-21',preview:'Executive theme 18-point fix, Forge spawned for SS+ polish',size:4096},
                {date:'2026-02-20',preview:'Green Iso finalized, Sentinel audit passed, FeedCast deploy',size:6144},
                {date:'2026-02-19',preview:'Claude Code hang bug discovered, switched to OC sub-agents',size:3072},
                {date:'2026-02-18',preview:'/tmp/ disaster — all services lost after reboot. NEVER AGAIN.',size:5120},
                {date:'2026-02-17',preview:'Stripe integration, HeyGen video tests, fleet standup protocol',size:4608},
            ],
            heartbeat:{lastChecks:{email:Date.now()-3600000,calendar:Date.now()-7200000,weather:null}}
        },
        souls: {
            ceo:'You are ApoMac — the CEO of a fleet of AI agents. You orchestrate, delegate, and ensure quality across all operations. You speak with authority but warmth. Your primary goal is to serve your human (Kira) with excellence...',
            forge:'You are Forge — the CTO. You build things. Infrastructure, code, deployments. You\'re meticulous, fast, and you never ship broken code. Your code is clean, your commits are atomic...',
            atlas:'You are Atlas — the COO. You keep the fleet running. Workflows, schedules, coordination. You make sure every cron fires, every standup happens, every process is documented...',
            hunter:'You are Hunter — the CRO. Revenue is your mission. You analyze markets, set prices, track conversions. Every dollar of MRR matters...',
            echo:'You are Echo — the CMO. Content, brand, storytelling. You craft narratives that resonate. From TikTok scripts to blog posts...',
            sentinel:'You are Sentinel — QA & Security. Nothing ships without your review. You audit code, check for secrets, verify quality gates...',
        },
        subAgentNames:['TaskRunner-01','CodeGuard-02','DocBot-03','QualityBot-04','DataSync-05','ContentGen-01','PriceCalc-02']
    };

    var AGENTS = {
        ceo:      { name: 'ApoMac', role: 'CEO', color: '#007AFF', status: 'active', task: 'Orchestrating fleet operations', isSubAgent: false },
        atlas:    { name: 'Atlas',    role: 'COO',           color: '#BF5AF2', status: 'active', task: 'Coordinating FeedCast ops', isSubAgent: false },
        forge:    { name: 'Forge',    role: 'CTO',           color: '#FF9F0A', status: 'busy', task: 'Building Executive theme SS+', isSubAgent: false },
        hunter:   { name: 'Hunter',   role: 'CRO',           color: '#FF453A', status: 'active', task: 'Analyzing conversion funnel', isSubAgent: false },
        echo:     { name: 'Echo',     role: 'CMO',           color: '#0A84FF', status: 'idle', task: 'Awaiting content brief', isSubAgent: false },
        sentinel: { name: 'Sentinel', role: 'QA & Security', color: '#30D158', status: 'active', task: 'Auditing deploy artifacts', isSubAgent: false },
    };

    var AVATAR_MAP = {
        'ApoMac': 'avatar-ceo',
        'Atlas': 'avatar-atlas',
        'Forge': 'avatar-forge',
        'Hunter': 'avatar-hunter',
        'Echo': 'avatar-echo',
        'Sentinel': 'avatar-sentinel'
    };

    var API = null;
    var chatHistory = [];
    var LIVE_MESSAGES = [];
    var LIVE_AGENT_DATA = {};
    var liveSessionData = null;
    var liveCronData = null;
    var liveMemoryData = null;
    var logsAutoRefresh = null;

    /* ═══════════════════════════════════════════════════════════════
       THEME ADAPTATION SYSTEM
       ═══════════════════════════════════════════════════════════════ */
    function getThemeVariables(theme) {
        switch(theme) {
            case 'gameboy':
                return `
                    --panel-bg: #0f380f;
                    --panel-text: #9bbc0f;
                    --panel-accent: #8bc34a;
                    --panel-border: rgba(155, 188, 15, 0.3);
                    --panel-secondary: #306230;
                    --panel-tertiary: rgba(155, 188, 15, 0.1);
                `;
            case 'sims':
                return `
                    --panel-bg: #ff6b6b;
                    --panel-text: #fff;
                    --panel-accent: #4ecdc4;
                    --panel-border: rgba(255, 255, 255, 0.3);
                    --panel-secondary: #ff5252;
                    --panel-tertiary: rgba(255, 255, 255, 0.1);
                `;
            case 'simcity':
                return `
                    --panel-bg: #3498db;
                    --panel-text: #fff;
                    --panel-accent: #2ecc71;
                    --panel-border: rgba(255, 255, 255, 0.3);
                    --panel-secondary: #2980b9;
                    --panel-tertiary: rgba(255, 255, 255, 0.1);
                `;
            case 'green-iso':
                return `
                    --panel-bg: rgba(0,0,0,0.8);
                    --panel-text: #4CAF50;
                    --panel-accent: #8BC34A;
                    --panel-border: rgba(76, 175, 80, 0.3);
                    --panel-secondary: rgba(0,0,0,0.9);
                    --panel-tertiary: rgba(76, 175, 80, 0.1);
                `;
            default:
                return `
                    --panel-bg: #FFFFFF;
                    --panel-text: #1C1C1E;
                    --panel-accent: #007AFF;
                    --panel-border: rgba(0, 0, 0, 0.1);
                    --panel-secondary: #F5F5F7;
                    --panel-tertiary: rgba(0, 0, 0, 0.03);
                `;
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       UNIVERSAL PANEL CSS
       ═══════════════════════════════════════════════════════════════ */
    function injectCSS(theme) {
        var existingStyle = document.getElementById('spawnkit-panels-css');
        if (existingStyle) existingStyle.remove();

        var css = `
            /* SpawnKit Panels — Universal CSS */
            ${getThemeVariables(theme)}

            /* Base Panel Styles */
            .spawnkit-overlay {
                position: fixed;
                inset: 0;
                z-index: 200;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .spawnkit-overlay.open {
                pointer-events: auto;
                opacity: 1;
            }
            .spawnkit-overlay.open .spawnkit-backdrop { opacity: 1; }
            .spawnkit-overlay.open .spawnkit-panel { transform: translateX(0); }

            .spawnkit-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,0.5);
                opacity: 0;
                transition: opacity 0.35s ease;
            }

            .spawnkit-panel {
                position: absolute;
                top: 0;
                right: 0;
                width: 420px;
                max-width: 90vw;
                height: 100%;
                background: var(--panel-bg);
                border-left: 1px solid var(--panel-border);
                display: flex;
                flex-direction: column;
                transform: translateX(100%);
                transition: transform 0.4s ease;
                box-shadow: -16px 0 48px rgba(0,0,0,0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: var(--panel-text);
            }

            .spawnkit-panel-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px;
                border-bottom: 1px solid var(--panel-border);
                flex-shrink: 0;
            }

            .spawnkit-panel-title {
                font-size: 17px;
                font-weight: 700;
                color: var(--panel-text);
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .spawnkit-panel-close {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                background: var(--panel-tertiary);
                color: var(--panel-text);
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s ease;
                font-family: inherit;
                opacity: 0.7;
            }

            .spawnkit-panel-close:hover {
                background: var(--panel-accent);
                opacity: 1;
            }

            .spawnkit-panel-body {
                flex: 1;
                overflow-y: auto;
                padding: 0;
                scrollbar-width: thin;
                scrollbar-color: var(--panel-accent) transparent;
            }

            .spawnkit-panel-body::-webkit-scrollbar {
                width: 4px;
            }

            .spawnkit-panel-body::-webkit-scrollbar-thumb {
                background: var(--panel-accent);
                border-radius: 2px;
            }

            .spawnkit-section {
                padding: 18px 24px;
                border-bottom: 1px solid var(--panel-border);
            }

            .spawnkit-section:last-child {
                border-bottom: none;
            }

            .spawnkit-section-title {
                font-size: 11px;
                font-weight: 600;
                color: var(--panel-text);
                opacity: 0.7;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 12px;
            }

            /* Logs Panel */
            .spawnkit-logs-metrics {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                padding: 14px 24px;
                border-bottom: 1px solid var(--panel-border);
                background: var(--panel-tertiary);
            }

            .spawnkit-metric-card {
                padding: 8px 10px;
                background: var(--panel-bg);
                border-radius: 8px;
                border: 1px solid var(--panel-border);
                text-align: center;
            }

            .spawnkit-metric-value {
                font-size: 15px;
                font-weight: 700;
                color: var(--panel-text);
            }

            .spawnkit-metric-label {
                font-size: 10px;
                font-weight: 500;
                color: var(--panel-text);
                opacity: 0.6;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 2px;
            }

            .spawnkit-log-entry {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 8px 24px;
                border-bottom: 1px solid var(--panel-border);
                font-size: 12px;
                line-height: 1.5;
                font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
                transition: background 0.15s;
            }

            .spawnkit-log-entry:hover {
                background: var(--panel-tertiary);
            }

            .spawnkit-log-time {
                color: var(--panel-text);
                opacity: 0.6;
                white-space: nowrap;
                font-size: 11px;
                min-width: 55px;
                flex-shrink: 0;
            }

            .spawnkit-log-role {
                font-weight: 600;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 1px 6px;
                border-radius: 4px;
                white-space: nowrap;
                flex-shrink: 0;
                min-width: 60px;
                text-align: center;
            }

            .spawnkit-log-role--user { background: rgba(0,122,255,0.12); color: #007AFF; }
            .spawnkit-log-role--assistant { background: rgba(48,209,88,0.12); color: #30D158; }
            .spawnkit-log-role--system { background: rgba(255,214,10,0.12); color: #B89B00; }
            .spawnkit-log-role--error { background: rgba(255,69,58,0.12); color: #FF453A; }

            .spawnkit-log-text {
                flex: 1;
                color: var(--panel-text);
                opacity: 0.8;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                min-width: 0;
            }

            /* Chat Panel */
            .spawnkit-chat-panel {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 480px;
                max-width: 100vw;
                height: 70vh;
                background: var(--panel-bg);
                border-top-left-radius: 16px;
                border-left: 1px solid var(--panel-border);
                border-top: 1px solid var(--panel-border);
                display: flex;
                flex-direction: column;
                transform: translateY(100%);
                transition: transform 0.4s ease;
                box-shadow: -8px -8px 32px rgba(0,0,0,0.12);
            }

            .spawnkit-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px 20px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                scrollbar-width: thin;
                scrollbar-color: var(--panel-accent) transparent;
            }

            .spawnkit-chat-msg {
                max-width: 80%;
                padding: 10px 14px;
                border-radius: 14px;
                font-size: 13px;
                line-height: 1.45;
                animation: spawnkitChatMsgIn 0.25s ease;
            }

            @keyframes spawnkitChatMsgIn {
                from { opacity: 0; transform: translateY(6px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .spawnkit-chat-msg--user {
                align-self: flex-end;
                background: var(--panel-accent);
                color: white;
                border-bottom-right-radius: 4px;
            }

            .spawnkit-chat-msg--system {
                align-self: flex-start;
                background: var(--panel-tertiary);
                color: var(--panel-text);
                border-bottom-left-radius: 4px;
            }

            .spawnkit-chat-input-bar {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 20px;
                border-top: 1px solid var(--panel-border);
                flex-shrink: 0;
            }

            .spawnkit-chat-input {
                flex: 1;
                height: 40px;
                padding: 0 14px;
                background: var(--panel-tertiary);
                border: 1px solid var(--panel-border);
                border-radius: 20px;
                color: var(--panel-text);
                font-family: inherit;
                font-size: 13px;
                outline: none;
                transition: border-color 0.2s, box-shadow 0.2s;
            }

            .spawnkit-chat-input:focus {
                border-color: var(--panel-accent);
                box-shadow: 0 0 0 3px rgba(var(--panel-accent), 0.1);
            }

            .spawnkit-chat-send {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--panel-accent);
                color: white;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }

            .spawnkit-chat-send:hover {
                transform: scale(1.05);
            }

            /* Memory Panel */
            .spawnkit-memory-content {
                font-size: 13px;
                color: var(--panel-text);
                line-height: 1.6;
                opacity: 0.9;
            }

            .spawnkit-memory-content h1,
            .spawnkit-memory-content h2,
            .spawnkit-memory-content h3 {
                color: var(--panel-text);
                margin: 14px 0 6px;
                font-weight: 700;
            }

            .spawnkit-memory-content h1 { font-size: 18px; }
            .spawnkit-memory-content h2 { font-size: 15px; }
            .spawnkit-memory-content h3 { font-size: 13px; }

            .spawnkit-memory-content ul,
            .spawnkit-memory-content ol {
                padding-left: 18px;
                margin: 6px 0;
            }

            .spawnkit-memory-content li {
                margin: 3px 0;
            }

            .spawnkit-memory-content strong {
                color: var(--panel-text);
            }

            .spawnkit-memory-content code {
                background: var(--panel-tertiary);
                padding: 1px 5px;
                border-radius: 4px;
                font-size: 12px;
            }

            /* Cron Panel */
            .spawnkit-cron-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 14px;
                background: var(--panel-tertiary);
                border-radius: 10px;
                margin-bottom: 8px;
                transition: background 0.2s;
            }

            .spawnkit-cron-item:hover {
                background: var(--panel-accent);
                opacity: 0.8;
            }

            .spawnkit-cron-item-icon {
                font-size: 20px;
                flex-shrink: 0;
            }

            .spawnkit-cron-item-info {
                flex: 1;
                min-width: 0;
            }

            .spawnkit-cron-item-name {
                font-size: 13px;
                font-weight: 600;
                color: var(--panel-text);
            }

            .spawnkit-cron-item-schedule {
                font-size: 11px;
                color: var(--panel-text);
                opacity: 0.6;
                margin-top: 2px;
            }

            /* Agent Detail Panel */
            .spawnkit-agent-hero {
                display: flex;
                align-items: center;
                gap: 18px;
                padding: 24px 24px 20px;
                border-bottom: 1px solid var(--panel-border);
            }

            .spawnkit-agent-avatar {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                overflow: hidden;
                flex-shrink: 0;
                position: relative;
                background: var(--panel-accent);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
                font-weight: 700;
            }

            .spawnkit-agent-info {
                flex: 1;
                min-width: 0;
            }

            .spawnkit-agent-name {
                font-size: 18px;
                font-weight: 700;
                color: var(--panel-text);
            }

            .spawnkit-agent-role {
                font-size: 13px;
                color: var(--panel-text);
                opacity: 0.7;
                font-weight: 500;
            }

            .spawnkit-agent-task {
                font-size: 12px;
                color: var(--panel-accent);
                margin-top: 4px;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Mission Panel */
            .spawnkit-mission-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 14px;
                background: var(--panel-tertiary);
                border-radius: 10px;
                margin-bottom: 8px;
            }

            .spawnkit-mission-progress {
                width: 40px;
                height: 4px;
                background: rgba(255,255,255,0.2);
                border-radius: 2px;
                overflow: hidden;
                flex-shrink: 0;
            }

            .spawnkit-mission-progress-fill {
                height: 100%;
                background: var(--panel-accent);
                border-radius: 2px;
                transition: width 0.3s;
            }

            /* Navigation Toolbar */
            .spawnkit-toolbar {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 56px;
                background: var(--panel-bg);
                border-top: 1px solid var(--panel-border);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                padding: 0 12px;
                z-index: 150;
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
            }
            .spawnkit-toolbar-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 2px;
                background: none;
                border: none;
                color: var(--panel-text);
                opacity: 0.6;
                cursor: pointer;
                padding: 6px 12px;
                border-radius: 10px;
                transition: all 0.2s;
                font-family: inherit;
            }
            .spawnkit-toolbar-btn:hover {
                opacity: 1;
                background: var(--panel-secondary);
            }
            .spawnkit-toolbar-btn span {
                font-size: 20px;
            }
            .spawnkit-toolbar-btn small {
                font-size: 10px;
                font-weight: 500;
            }

            /* Mailbox */
            .spawnkit-mail-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 14px 0;
                border-bottom: 1px solid var(--panel-border);
            }
            .spawnkit-mail-item:last-child { border-bottom: none; }
            .spawnkit-mail-priority {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-top: 6px;
                flex-shrink: 0;
            }
            .spawnkit-mail-priority.high { background: #FF3B30; }
            .spawnkit-mail-priority.medium { background: #FF9500; }
            .spawnkit-mail-priority.low { background: #34C759; }
            .spawnkit-mail-content { flex: 1; min-width: 0; }
            .spawnkit-mail-from {
                font-size: 13px;
                font-weight: 600;
                color: var(--panel-text);
            }
            .spawnkit-mail-subject {
                font-size: 12px;
                color: var(--panel-text);
                opacity: 0.8;
                margin-top: 2px;
            }
            .spawnkit-mail-time {
                font-size: 11px;
                color: var(--panel-text);
                opacity: 0.5;
                margin-top: 4px;
            }

            /* Settings */
            .spawnkit-settings-section {
                margin-bottom: 24px;
            }
            .spawnkit-settings-section h4 {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--panel-text);
                opacity: 0.5;
                margin: 0 0 12px 0;
            }
            .spawnkit-settings-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid var(--panel-border);
            }
            .spawnkit-settings-label {
                font-size: 13px;
                color: var(--panel-text);
            }
            .spawnkit-settings-value {
                font-size: 13px;
                color: var(--panel-accent);
                font-family: 'SF Mono', monospace;
            }

            /* Toast */
            .spawnkit-toast {
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                padding: 10px 20px;
                background: var(--panel-secondary);
                color: var(--panel-text);
                border-radius: 10px;
                font-size: 13px;
                font-weight: 500;
                z-index: 999;
                opacity: 0;
                transition: all 0.3s ease;
                pointer-events: none;
                box-shadow: 0 8px 24px rgba(0,0,0,0.25);
            }

            .spawnkit-toast.show {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }

            /* Responsive */
            @media (max-width: 768px) {
                .spawnkit-panel,
                .spawnkit-chat-panel {
                    width: 100vw;
                }
            }

            /* Theme-specific overrides */
            ${theme === 'gameboy' ? `
                .spawnkit-panel {
                    font-family: 'Courier New', monospace;
                    border: 2px solid var(--panel-text);
                }
                .spawnkit-log-entry {
                    font-family: 'Courier New', monospace;
                }
                .spawnkit-panel-title {
                    text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
                }
            ` : ''}

            ${theme === 'sims' ? `
                .spawnkit-panel {
                    border-radius: 12px 0 0 0;
                    border: 2px solid rgba(255,255,255,0.3);
                }
                .spawnkit-section-title {
                    font-family: 'Comic Sans MS', cursive;
                }
            ` : ''}

            ${theme === 'simcity' ? `
                .spawnkit-panel {
                    background: linear-gradient(135deg, var(--panel-bg) 0%, var(--panel-secondary) 100%);
                }
                .spawnkit-cron-item {
                    border-left: 3px solid var(--panel-accent);
                }
            ` : ''}

            ${theme === 'green-iso' ? `
                .spawnkit-panel {
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(76,175,80,0.3);
                }
                .spawnkit-log-entry {
                    font-family: 'Fira Code', 'SF Mono', monospace;
                }
            ` : ''}
        `;

        var style = document.createElement('style');
        style.id = 'spawnkit-panels-css';
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ═══════════════════════════════════════════════════════════════
       UNIVERSAL PANEL HTML TEMPLATES
       ═══════════════════════════════════════════════════════════════ */
    function injectHTML() {
        var overlayContainer = document.getElementById('spawnkit-overlays');
        if (!overlayContainer) {
            overlayContainer = document.createElement('div');
            overlayContainer.id = 'spawnkit-overlays';
            document.body.appendChild(overlayContainer);
        }

        overlayContainer.innerHTML = `
            <!-- Logs Panel -->
            <div class="spawnkit-overlay" id="spawnkitLogsOverlay" role="dialog" aria-modal="true" aria-label="Activity Logs">
                <div class="spawnkit-backdrop" id="spawnkitLogsBackdrop"></div>
                <div class="spawnkit-panel">
                    <div class="spawnkit-panel-header">
                        <div class="spawnkit-panel-title">
                            <span aria-hidden="true">📜</span>
                            Activity Logs
                        </div>
                        <button class="spawnkit-panel-close" id="spawnkitLogsClose" aria-label="Close">×</button>
                    </div>
                    <div class="spawnkit-logs-metrics" id="spawnkitLogsMetrics">
                        <!-- Metrics populated by JS -->
                    </div>
                    <div class="spawnkit-panel-body" id="spawnkitLogsBody">
                        <!-- Logs populated by JS -->
                    </div>
                </div>
            </div>

            <!-- Chat Panel -->
            <div class="spawnkit-overlay" id="spawnkitChatOverlay" role="dialog" aria-modal="true" aria-label="CEO Chat">
                <div class="spawnkit-backdrop" id="spawnkitChatBackdrop"></div>
                <div class="spawnkit-chat-panel">
                    <div class="spawnkit-panel-header">
                        <div class="spawnkit-panel-title">
                            <span aria-hidden="true">💬</span>
                            CEO Chat
                        </div>
                        <button class="spawnkit-panel-close" id="spawnkitChatClose" aria-label="Close">×</button>
                    </div>
                    <div class="spawnkit-chat-messages" id="spawnkitChatMessages">
                        <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--panel-text); opacity: 0.6; font-size: 13px;">
                            No messages yet. Send a mission to the CEO.
                        </div>
                    </div>
                    <div class="spawnkit-chat-input-bar">
                        <input class="spawnkit-chat-input" id="spawnkitChatInput" type="text" placeholder="Message the fleet..." autocomplete="off" spellcheck="false" />
                        <button class="spawnkit-chat-send" id="spawnkitChatSend" aria-label="Send">↑</button>
                    </div>
                </div>
            </div>

            <!-- Cron Panel -->
            <div class="spawnkit-overlay" id="spawnkitCronOverlay" role="dialog" aria-modal="true" aria-label="Cron Jobs">
                <div class="spawnkit-backdrop" id="spawnkitCronBackdrop"></div>
                <div class="spawnkit-panel">
                    <div class="spawnkit-panel-header">
                        <div class="spawnkit-panel-title">
                            <span aria-hidden="true">📅</span>
                            Scheduled Jobs
                        </div>
                        <button class="spawnkit-panel-close" id="spawnkitCronClose" aria-label="Close">×</button>
                    </div>
                    <div class="spawnkit-panel-body" id="spawnkitCronBody">
                        <!-- Cron jobs populated by JS -->
                    </div>
                </div>
            </div>

            <!-- Memory Panel -->
            <div class="spawnkit-overlay" id="spawnkitMemoryOverlay" role="dialog" aria-modal="true" aria-label="Memory View">
                <div class="spawnkit-backdrop" id="spawnkitMemoryBackdrop"></div>
                <div class="spawnkit-panel">
                    <div class="spawnkit-panel-header">
                        <div class="spawnkit-panel-title">
                            <span aria-hidden="true">🧠</span>
                            Fleet Memory
                        </div>
                        <button class="spawnkit-panel-close" id="spawnkitMemoryClose" aria-label="Close">×</button>
                    </div>
                    <div class="spawnkit-panel-body" id="spawnkitMemoryBody">
                        <!-- Memory content populated by JS -->
                    </div>
                </div>
            </div>

            <!-- Agent Detail Panel -->
            <div class="spawnkit-overlay" id="spawnkitDetailOverlay" role="dialog" aria-modal="true" aria-label="Agent Details">
                <div class="spawnkit-backdrop" id="spawnkitDetailBackdrop"></div>
                <div class="spawnkit-panel">
                    <div class="spawnkit-agent-hero">
                        <div class="spawnkit-agent-avatar" id="spawnkitDetailAvatar">
                            <!-- Avatar populated by JS -->
                        </div>
                        <div class="spawnkit-agent-info">
                            <div class="spawnkit-agent-name" id="spawnkitDetailName">Agent</div>
                            <div class="spawnkit-agent-role" id="spawnkitDetailRole">Role</div>
                            <div class="spawnkit-agent-task" id="spawnkitDetailTask">—</div>
                        </div>
                        <button class="spawnkit-panel-close" id="spawnkitDetailClose" aria-label="Close">×</button>
                    </div>
                    <div class="spawnkit-panel-body" id="spawnkitDetailBody">
                        <!-- Agent details populated by JS -->
                    </div>
                </div>
            </div>

            <!-- Mission Panel -->
            <div class="spawnkit-overlay" id="spawnkitMissionsOverlay" role="dialog" aria-modal="true" aria-label="Active Missions">
                <div class="spawnkit-backdrop" id="spawnkitMissionsBackdrop"></div>
                <div class="spawnkit-panel">
                    <div class="spawnkit-panel-header">
                        <div class="spawnkit-panel-title">
                            <span aria-hidden="true">🎯</span>
                            Active Missions
                        </div>
                        <button class="spawnkit-panel-close" id="spawnkitMissionsClose" aria-label="Close">×</button>
                    </div>
                    <div class="spawnkit-panel-body" id="spawnkitMissionsBody">
                        <!-- Missions populated by JS -->
                    </div>
                </div>
            </div>

            <!-- CEO Cockpit Panel -->
            <div class="spawnkit-overlay" id="spawnkitCockpitOverlay" role="dialog" aria-modal="true" aria-label="CEO Cockpit">
                <div class="spawnkit-backdrop" id="spawnkitCockpitBackdrop"></div>
                <div class="spawnkit-panel" style="width: 520px;">
                    <div class="spawnkit-agent-hero" style="background: linear-gradient(135deg, var(--panel-accent), var(--panel-secondary));">
                        <div class="spawnkit-agent-avatar" style="border: 3px solid white;">
                            👑
                        </div>
                        <div class="spawnkit-agent-info">
                            <div class="spawnkit-agent-name" style="color: white;">ApoMac</div>
                            <div class="spawnkit-agent-role" style="color: rgba(255,255,255,0.9);">Chief Executive Officer</div>
                            <div class="spawnkit-agent-task" style="color: rgba(255,255,255,0.8);">Orchestrating fleet operations</div>
                        </div>
                        <button class="spawnkit-panel-close" id="spawnkitCockpitClose" aria-label="Close">×</button>
                    </div>
                    <div class="spawnkit-panel-body" id="spawnkitCockpitBody">
                        <!-- CEO cockpit content populated by JS -->
                    </div>
                </div>
            </div>

            <!-- Mailbox Panel -->
            <div class="spawnkit-overlay" id="spawnkitMailboxOverlay" role="dialog" aria-modal="true" aria-label="Mailbox">
                <div class="spawnkit-backdrop" id="spawnkitMailboxBackdrop"></div>
                <div class="spawnkit-panel">
                    <div class="spawnkit-panel-header">
                        <div class="spawnkit-panel-title"><span>📬</span> Mailbox</div>
                        <button class="spawnkit-panel-close" id="spawnkitMailboxClose" aria-label="Close">×</button>
                    </div>
                    <div class="spawnkit-panel-body" id="spawnkitMailboxBody"></div>
                </div>
            </div>

            <!-- Settings Panel -->
            <div class="spawnkit-overlay" id="spawnkitSettingsOverlay" role="dialog" aria-modal="true" aria-label="Settings">
                <div class="spawnkit-backdrop" id="spawnkitSettingsBackdrop"></div>
                <div class="spawnkit-panel" style="width: 520px;">
                    <div class="spawnkit-panel-header">
                        <div class="spawnkit-panel-title"><span>⚙️</span> Settings</div>
                        <button class="spawnkit-panel-close" id="spawnkitSettingsClose" aria-label="Close">×</button>
                    </div>
                    <div class="spawnkit-panel-body" id="spawnkitSettingsBody"></div>
                </div>
            </div>

            <!-- Navigation Toolbar -->
            <div class="spawnkit-toolbar" id="spawnkitToolbar">
                <button class="spawnkit-toolbar-btn" data-panel="cockpit" title="CEO Cockpit"><span>👑</span><small>Cockpit</small></button>
                <button class="spawnkit-toolbar-btn" data-panel="missions" title="Active Missions"><span>🎯</span><small>Missions</small></button>
                <button class="spawnkit-toolbar-btn" data-panel="logs" title="Fleet Logs"><span>📊</span><small>Logs</small></button>
                <button class="spawnkit-toolbar-btn" data-panel="cron" title="Cron Jobs"><span>📅</span><small>Cron</small></button>
                <button class="spawnkit-toolbar-btn" data-panel="memory" title="Memory"><span>🧠</span><small>Memory</small></button>
                <button class="spawnkit-toolbar-btn" data-panel="mailbox" title="Mailbox"><span>📬</span><small>Mail</small></button>
                <button class="spawnkit-toolbar-btn" data-panel="chat" title="Chat"><span>💬</span><small>Chat</small></button>
                <button class="spawnkit-toolbar-btn" data-panel="settings" title="Settings"><span>⚙️</span><small>Settings</small></button>
            </div>

            <!-- Toast -->
            <div class="spawnkit-toast" id="spawnkitToast"></div>
        `;
    }

    /* ═══════════════════════════════════════════════════════════════
       PANEL FUNCTIONS — All 18 Features
       ═══════════════════════════════════════════════════════════════ */

    // Utility functions
    function showToast(msg) {
        var toast = document.getElementById('spawnkitToast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(function() { toast.classList.remove('show'); }, 2500);
    }

    function closeAllPanels() {
        var overlays = document.querySelectorAll('.spawnkit-overlay');
        overlays.forEach(function(overlay) {
            overlay.classList.remove('open');
        });
        document.body.style.overflow = '';
    }

    // Feature 1: Agent Detail Panel
    function openAgentDetail(agentId) {
        closeAllPanels();
        
        var agent = AGENTS[agentId];
        if (!agent) return;

        var overlay = document.getElementById('spawnkitDetailOverlay');
        var avatar = document.getElementById('spawnkitDetailAvatar');
        var name = document.getElementById('spawnkitDetailName');
        var role = document.getElementById('spawnkitDetailRole');
        var task = document.getElementById('spawnkitDetailTask');
        var body = document.getElementById('spawnkitDetailBody');

        // Set basic info
        avatar.textContent = agent.name.charAt(0);
        avatar.style.background = agent.color;
        name.textContent = agent.name;
        role.textContent = agent.role;
        task.textContent = agent.task;

        // Build detailed content
        var todoData = LIVE_AGENT_DATA[agentId] || {todos: [], skills: [], currentTask: agent.task};
        var metrics = DEMO.logMetrics[agentId] || {tokens:'—',model:'—',uptime:'—',tasks:0};

        var html = `
            <div class="spawnkit-section">
                <div class="spawnkit-section-title">Metrics</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div style="padding: 8px; background: var(--panel-tertiary); border-radius: 8px; text-align: center;">
                        <div style="font-size: 14px; font-weight: 700;">${metrics.tokens}</div>
                        <div style="font-size: 10px; opacity: 0.7;">Tokens</div>
                    </div>
                    <div style="padding: 8px; background: var(--panel-tertiary); border-radius: 8px; text-align: center;">
                        <div style="font-size: 14px; font-weight: 700;">${metrics.model}</div>
                        <div style="font-size: 10px; opacity: 0.7;">Model</div>
                    </div>
                </div>
            </div>
        `;

        if (todoData.todos && todoData.todos.length > 0) {
            html += `
                <div class="spawnkit-section">
                    <div class="spawnkit-section-title">Current Tasks</div>
            `;
            todoData.todos.forEach(function(todo) {
                var statusStyle = todo.status === 'done' ? 'opacity: 0.5; text-decoration: line-through;' : '';
                html += `
                    <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0; ${statusStyle}">
                        <span style="font-size: 16px;">${todo.icon}</span>
                        <span style="flex: 1; font-size: 13px;">${todo.text}</span>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (todoData.skills && todoData.skills.length > 0) {
            html += `
                <div class="spawnkit-section">
                    <div class="spawnkit-section-title">Skills (${todoData.skills.length})</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            `;
            todoData.skills.forEach(function(skill) {
                html += `<span style="padding: 4px 8px; background: var(--panel-tertiary); border-radius: 12px; font-size: 11px;">${skill.name || skill}</span>`;
            });
            html += '</div></div>';
        }

        body.innerHTML = html;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    // Feature 2: CEO Chat Panel
    function openChatOverlay() {
        closeAllPanels();
        var overlay = document.getElementById('spawnkitChatOverlay');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        loadChatHistory();
    }

    function loadChatHistory() {
        var messages = document.getElementById('spawnkitChatMessages');
        if (chatHistory.length === 0) {
            chatHistory = DEMO.chatHistory.slice();
        }
        
        messages.innerHTML = '';
        chatHistory.forEach(function(msg) {
            var div = document.createElement('div');
            div.className = 'spawnkit-chat-msg spawnkit-chat-msg--' + msg.role;
            div.innerHTML = `
                <div>${msg.text}</div>
                ${msg.time ? '<div style="font-size: 10px; opacity: 0.6; margin-top: 4px;">' + msg.time + '</div>' : ''}
            `;
            messages.appendChild(div);
        });
        messages.scrollTop = messages.scrollHeight;
    }

    function sendChatMessage() {
        var input = document.getElementById('spawnkitChatInput');
        var text = input.value.trim();
        if (!text) return;
        
        input.value = '';
        var now = new Date();
        var time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
        
        chatHistory.push({ role: 'user', text: text, time: time });
        chatHistory.push({ role: 'system', text: '✅ Mission received — routing to fleet', time: time });
        
        loadChatHistory();
        showToast('📨 Message sent to CEO');
    }

    // Feature 3: Real-Time Log Viewer
    function openLogsOverlay() {
        closeAllPanels();
        var overlay = document.getElementById('spawnkitLogsOverlay');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderLogs();
    }

    function renderLogs() {
        var metrics = document.getElementById('spawnkitLogsMetrics');
        var body = document.getElementById('spawnkitLogsBody');
        var met = DEMO.logMetrics.ceo;

        // Metrics header
        metrics.innerHTML = `
            <div class="spawnkit-metric-card">
                <div class="spawnkit-metric-value">${met.tokens}</div>
                <div class="spawnkit-metric-label">Tokens</div>
            </div>
            <div class="spawnkit-metric-card">
                <div class="spawnkit-metric-value">${met.model}</div>
                <div class="spawnkit-metric-label">Model</div>
            </div>
            <div class="spawnkit-metric-card">
                <div class="spawnkit-metric-value">${met.uptime}</div>
                <div class="spawnkit-metric-label">Uptime</div>
            </div>
            <div class="spawnkit-metric-card">
                <div class="spawnkit-metric-value">${met.tasks}</div>
                <div class="spawnkit-metric-label">Tasks</div>
            </div>
        `;

        // Log entries
        var logs = [];
        Object.keys(DEMO.logs).forEach(function(agent) {
            DEMO.logs[agent].forEach(function(entry) {
                var logEntry = Object.assign({}, entry);
                logEntry._agent = agent;
                logs.push(logEntry);
            });
        });
        
        logs.sort(function(a,b) { return b.timestamp - a.timestamp; });
        logs = logs.slice(0, 30);

        var html = '';
        logs.forEach(function(entry) {
            var time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}) : '—';
            var roleClass = 'spawnkit-log-role--' + (entry.role || 'system');
            var text = (entry.text || '').substring(0, 100);
            if (entry.text && entry.text.length > 100) text += '…';
            
            html += `
                <div class="spawnkit-log-entry">
                    <span class="spawnkit-log-time">${time}</span>
                    <span class="spawnkit-log-role ${roleClass}">${entry.role || 'system'}</span>
                    <span class="spawnkit-log-text">${text}</span>
                </div>
            `;
        });

        body.innerHTML = html;
    }

    // Feature 4: Cron/Calendar Panel
    function openCronOverlay() {
        closeAllPanels();
        var overlay = document.getElementById('spawnkitCronOverlay');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderCronJobs();
    }

    function renderCronJobs() {
        var body = document.getElementById('spawnkitCronBody');
        var crons = DEMO.crons;

        var html = '<div class="spawnkit-section">';
        crons.forEach(function(cron) {
            html += `
                <div class="spawnkit-cron-item">
                    <span class="spawnkit-cron-item-icon">${cron.icon}</span>
                    <div class="spawnkit-cron-item-info">
                        <div class="spawnkit-cron-item-name">${cron.name}</div>
                        <div class="spawnkit-cron-item-schedule">${cron.schedule} • Next: ${new Date(cron.nextRun).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; background: var(--panel-tertiary);">${cron.status}</span>
                </div>
            `;
        });
        html += '</div>';

        body.innerHTML = html;
    }

    // Feature 5: Memory Panel  
    function openMemoryOverlay() {
        closeAllPanels();
        var overlay = document.getElementById('spawnkitMemoryOverlay');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderMemory();
    }

    function renderMemory() {
        var body = document.getElementById('spawnkitMemoryBody');
        var memory = DEMO.memory;
        
        var html = '';
        
        if (memory.longTerm && memory.longTerm.content) {
            html += `
                <div class="spawnkit-section">
                    <div class="spawnkit-section-title">MEMORY.md</div>
                    <div class="spawnkit-memory-content">
                        ${renderMarkdown(memory.longTerm.content.substring(0, 2000))}
                        ${memory.longTerm.content.length > 2000 ? '<div style="opacity: 0.6; font-size: 11px; margin-top: 8px;">...truncated</div>' : ''}
                    </div>
                </div>
            `;
        }

        if (memory.daily && memory.daily.length > 0) {
            html += `
                <div class="spawnkit-section">
                    <div class="spawnkit-section-title">Daily Notes</div>
            `;
            memory.daily.forEach(function(day) {
                html += `
                    <div style="display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--panel-border);">
                        <span style="font-weight: 600; min-width: 80px;">${day.date}</span>
                        <span style="flex: 1; opacity: 0.8;">${day.preview}</span>
                        <span style="opacity: 0.6; font-size: 11px;">${(day.size/1024).toFixed(1)}K</span>
                    </div>
                `;
            });
            html += '</div>';
        }

        body.innerHTML = html;
    }

    function renderMarkdown(md) {
        if (!md) return '';
        return md
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/^- (.+)$/gm, '• $1<br>')
            .replace(/\n/g, '<br>');
    }

    // Feature 6: Mission Panel
    function openMissionsOverlay() {
        closeAllPanels();
        var overlay = document.getElementById('spawnkitMissionsOverlay');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderMissions();
    }

    function renderMissions() {
        var body = document.getElementById('spawnkitMissionsBody');
        var missions = DEMO.missions;
        
        var running = missions.filter(function(m) { return m.status === 'running'; });
        var completed = missions.filter(function(m) { return m.status === 'completed'; });
        
        var html = '';
        
        if (running.length > 0) {
            html += '<div class="spawnkit-section"><div class="spawnkit-section-title">🔴 Active</div>';
            running.forEach(function(mission) {
                var progress = Math.round(mission.progress * 100);
                html += `
                    <div class="spawnkit-mission-item">
                        <span style="font-size: 16px;">🚀</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 13px;">${mission.name}</div>
                            <div style="opacity: 0.7; font-size: 12px;">${mission.label}</div>
                            <div style="opacity: 0.5; font-size: 11px;">${mission.parent} • ${mission.duration}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 600; color: var(--panel-accent);">${progress}%</div>
                            <div class="spawnkit-mission-progress">
                                <div class="spawnkit-mission-progress-fill" style="width: ${progress}%;"></div>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (completed.length > 0) {
            html += '<div class="spawnkit-section"><div class="spawnkit-section-title">✅ Completed</div>';
            completed.forEach(function(mission) {
                html += `
                    <div class="spawnkit-mission-item" style="opacity: 0.6;">
                        <span style="font-size: 16px;">✅</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 13px;">${mission.name}</div>
                            <div style="opacity: 0.7; font-size: 12px;">${mission.label}</div>
                        </div>
                        <div style="color: #30D158; font-size: 12px; font-weight: 600;">Done</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        body.innerHTML = html;
    }

    // Feature 7: CEO Cockpit Panel
    function openCockpitOverlay() {
        closeAllPanels();
        var overlay = document.getElementById('spawnkitCockpitOverlay');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderCockpit();
    }

    function renderCockpit() {
        var body = document.getElementById('spawnkitCockpitBody');
        
        var activeAgents = Object.keys(AGENTS).filter(function(k) { return AGENTS[k].status !== 'idle'; }).length;
        var runningMissions = DEMO.missions.filter(function(m) { return m.status === 'running'; }).length;
        
        var html = `
            <div class="spawnkit-section">
                <div class="spawnkit-section-title">📊 Fleet Overview</div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                    <div style="padding: 12px; background: var(--panel-tertiary); border-radius: 8px; text-align: center;">
                        <div style="font-size: 18px; font-weight: 700;">${activeAgents}</div>
                        <div style="font-size: 10px; opacity: 0.7;">Active</div>
                    </div>
                    <div style="padding: 12px; background: var(--panel-tertiary); border-radius: 8px; text-align: center;">
                        <div style="font-size: 18px; font-weight: 700;">${6 - activeAgents}</div>
                        <div style="font-size: 10px; opacity: 0.7;">Idle</div>
                    </div>
                    <div style="padding: 12px; background: var(--panel-tertiary); border-radius: 8px; text-align: center;">
                        <div style="font-size: 18px; font-weight: 700;">${runningMissions}</div>
                        <div style="font-size: 10px; opacity: 0.7;">Missions</div>
                    </div>
                    <div style="padding: 12px; background: var(--panel-tertiary); border-radius: 8px; text-align: center;">
                        <div style="font-size: 18px; font-weight: 700;">252K</div>
                        <div style="font-size: 10px; opacity: 0.7;">Tokens</div>
                    </div>
                </div>
            </div>
            
            <div class="spawnkit-section">
                <div class="spawnkit-section-title">💬 Recent Chat</div>
                <div style="max-height: 200px; overflow-y: auto;">
        `;
        
        chatHistory.slice(-5).forEach(function(msg) {
            html += `
                <div style="padding: 8px; margin: 4px 0; background: var(--panel-tertiary); border-radius: 8px; font-size: 12px;">
                    <strong>${msg.role === 'user' ? 'Kira' : 'CEO'}:</strong> ${msg.text.substring(0, 100)}${msg.text.length > 100 ? '...' : ''}
                </div>
            `;
        });
        
        html += '</div></div>';
        
        body.innerHTML = html;
    }

    // Feature: Mailbox Panel
    function openMailboxOverlay() {
        closeAllPanels();
        var overlay = document.getElementById('spawnkitMailboxOverlay');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderMailbox();
    }

    function renderMailbox() {
        var body = document.getElementById('spawnkitMailboxBody');
        var html = '<div class="spawnkit-section"><div class="spawnkit-section-title">📬 Fleet Messages</div>';
        
        LIVE_MESSAGES.forEach(function(msg) {
            var priorityClass = (msg.priority || 'low').toLowerCase();
            var timeAgo = formatTimeAgo(msg.timestamp || Date.now() - 60000);
            html += '<div class="spawnkit-mail-item">';
            html += '<div class="spawnkit-mail-priority ' + priorityClass + '"></div>';
            html += '<div class="spawnkit-mail-content">';
            html += '<div class="spawnkit-mail-from">' + (msg.from || 'System') + ' → ' + (msg.to || 'CEO') + '</div>';
            html += '<div class="spawnkit-mail-subject">' + (msg.subject || msg.text || '') + '</div>';
            html += '<div class="spawnkit-mail-time">' + timeAgo + '</div>';
            html += '</div></div>';
        });
        
        if (LIVE_MESSAGES.length === 0) {
            html += '<div style="padding: 40px; text-align: center; opacity: 0.5;">📭 No messages</div>';
        }
        
        html += '</div>';
        body.innerHTML = html;
    }

    function formatTimeAgo(ts) {
        var diff = Math.floor((Date.now() - ts) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return diff + 'm ago';
        if (diff < 1440) return Math.floor(diff / 60) + 'h ago';
        return Math.floor(diff / 1440) + 'd ago';
    }

    // Feature: Settings Panel
    function openSettingsOverlay() {
        closeAllPanels();
        var overlay = document.getElementById('spawnkitSettingsOverlay');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderSettings();
    }

    function renderSettings() {
        var body = document.getElementById('spawnkitSettingsBody');
        var html = '';
        
        html += '<div class="spawnkit-settings-section"><h4>Fleet Configuration</h4>';
        var rows = [
            ['Default Model', 'claude-opus-4-6'],
            ['Sub-agent Model', 'claude-sonnet-4'],
            ['Max Concurrency', '2 main + 4 sub'],
            ['Heartbeat', '30 min'],
            ['Theme', _config.theme || 'default'],
            ['API Endpoint', 'localhost:8317']
        ];
        rows.forEach(function(r) {
            html += '<div class="spawnkit-settings-row">';
            html += '<span class="spawnkit-settings-label">' + r[0] + '</span>';
            html += '<span class="spawnkit-settings-value">' + r[1] + '</span>';
            html += '</div>';
        });
        html += '</div>';
        
        html += '<div class="spawnkit-settings-section"><h4>Agent ↔ OpenClaw Mapping</h4>';
        Object.keys(AGENTS).forEach(function(id) {
            var agent = AGENTS[id];
            html += '<div class="spawnkit-settings-row">';
            html += '<span class="spawnkit-settings-label">' + agent.emoji + ' ' + agent.name + '</span>';
            html += '<span class="spawnkit-settings-value">' + id + '</span>';
            html += '</div>';
        });
        html += '</div>';
        
        html += '<div class="spawnkit-settings-section"><h4>API Keys</h4>';
        var keys = [
            ['OpenClaw', '••••••••sk-4f2a'],
            ['CLIProxyAPI', '••••••••8317'],
            ['ElevenLabs', '••••••••ZXDm']
        ];
        keys.forEach(function(k) {
            html += '<div class="spawnkit-settings-row">';
            html += '<span class="spawnkit-settings-label">' + k[0] + '</span>';
            html += '<span class="spawnkit-settings-value">' + k[1] + '</span>';
            html += '</div>';
        });
        html += '</div>';
        
        body.innerHTML = html;
    }

    /* ═══════════════════════════════════════════════════════════════
       EVENT HANDLERS
       ═══════════════════════════════════════════════════════════════ */
    function initEventHandlers() {
        // Close buttons
        document.getElementById('spawnkitLogsClose').addEventListener('click', function() {
            document.getElementById('spawnkitLogsOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        
        document.getElementById('spawnkitChatClose').addEventListener('click', function() {
            document.getElementById('spawnkitChatOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        
        document.getElementById('spawnkitCronClose').addEventListener('click', function() {
            document.getElementById('spawnkitCronOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        
        document.getElementById('spawnkitMemoryClose').addEventListener('click', function() {
            document.getElementById('spawnkitMemoryOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        
        document.getElementById('spawnkitDetailClose').addEventListener('click', function() {
            document.getElementById('spawnkitDetailOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        
        document.getElementById('spawnkitMissionsClose').addEventListener('click', function() {
            document.getElementById('spawnkitMissionsOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        
        document.getElementById('spawnkitCockpitClose').addEventListener('click', function() {
            document.getElementById('spawnkitCockpitOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });

        // Backdrop clicks
        document.getElementById('spawnkitLogsBackdrop').addEventListener('click', function() {
            document.getElementById('spawnkitLogsOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        
        document.getElementById('spawnkitChatBackdrop').addEventListener('click', function() {
            document.getElementById('spawnkitChatOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        
        document.getElementById('spawnkitCronBackdrop').addEventListener('click', function() {
            document.getElementById('spawnkitCronOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        
        document.getElementById('spawnkitMemoryBackdrop').addEventListener('click', function() {
            document.getElementById('spawnkitMemoryOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        
        document.getElementById('spawnkitDetailBackdrop').addEventListener('click', function() {
            document.getElementById('spawnkitDetailOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        
        document.getElementById('spawnkitMissionsBackdrop').addEventListener('click', function() {
            document.getElementById('spawnkitMissionsOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        
        document.getElementById('spawnkitCockpitBackdrop').addEventListener('click', function() {
            document.getElementById('spawnkitCockpitOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });

        // Mailbox close + backdrop
        document.getElementById('spawnkitMailboxClose').addEventListener('click', function() {
            document.getElementById('spawnkitMailboxOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        document.getElementById('spawnkitMailboxBackdrop').addEventListener('click', function() {
            document.getElementById('spawnkitMailboxOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });

        // Settings close + backdrop
        document.getElementById('spawnkitSettingsClose').addEventListener('click', function() {
            document.getElementById('spawnkitSettingsOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });
        document.getElementById('spawnkitSettingsBackdrop').addEventListener('click', function() {
            document.getElementById('spawnkitSettingsOverlay').classList.remove('open');
            document.body.style.overflow = '';
        });

        // Toolbar navigation
        document.querySelectorAll('.spawnkit-toolbar-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                closeAllPanels();
                var panel = btn.dataset.panel;
                switch(panel) {
                    case 'cockpit': openCockpitOverlay(); break;
                    case 'missions': openMissionsOverlay(); break;
                    case 'logs': openLogsOverlay(); break;
                    case 'cron': openCronOverlay(); break;
                    case 'memory': openMemoryOverlay(); break;
                    case 'mailbox': openMailboxOverlay(); break;
                    case 'chat': openChatOverlay(); break;
                    case 'settings': openSettingsOverlay(); break;
                }
            });
        });

        // Chat send
        document.getElementById('spawnkitChatSend').addEventListener('click', sendChatMessage);
        document.getElementById('spawnkitChatInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendChatMessage();
            }
        });

        // Escape key handler
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeAllPanels();
            }
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       DATA LOADING
       ═══════════════════════════════════════════════════════════════ */
    function loadDemoData() {
        // Initialize live data with demo data
        LIVE_MESSAGES = DEMO.mailMessages.slice();
        chatHistory = DEMO.chatHistory.slice();
        
        // Setup agent data
        Object.keys(DEMO.todos).forEach(function(agentId) {
            var todos = DEMO.todos[agentId] || [];
            var skills = (DEMO.agentSkills[agentId] || []).map(function(skillName) {
                var skill = DEMO.skills.find(function(s) { return s.name === skillName; });
                return skill ? {name: skill.icon + ' ' + skill.name, description: skill.desc} : {name: skillName, description: ''};
            });
            var currentTask = (todos.find(function(t) { return t.status === 'progress'; }) || {}).text || AGENTS[agentId].task || 'Standby';
            
            LIVE_AGENT_DATA[agentId] = {
                currentTask: currentTask,
                todos: todos,
                skills: skills
            };
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       PUBLIC API
       ═══════════════════════════════════════════════════════════════ */
    return {
        init: function(config) {
            if (_isInitialized) return;
            
            _config = config || {};
            API = (typeof window.spawnkitAPI !== 'undefined') ? window.spawnkitAPI : null;
            
            injectCSS(_config.theme || 'executive');
            injectHTML();
            initEventHandlers();
            loadDemoData();
            
            _isInitialized = true;
            console.log('🚀 SpawnKit Panels initialized for theme:', _config.theme);
        },

        // Feature functions
        openAgentDetail: openAgentDetail,
        openLogsOverlay: openLogsOverlay,
        openChatOverlay: openChatOverlay,
        openCronOverlay: openCronOverlay,
        openMemoryOverlay: openMemoryOverlay,
        openMissionsOverlay: openMissionsOverlay,
        openCockpitOverlay: openCockpitOverlay,
        openMailboxOverlay: openMailboxOverlay,
        openSettingsOverlay: openSettingsOverlay,
        
        // Utility functions
        showToast: showToast,
        closeAllPanels: closeAllPanels,
        
        // Data access
        getAgents: function() { return AGENTS; },
        getDemoData: function() { return DEMO; },
        
        // Theme switching
        switchTheme: function(newTheme) {
            _config.theme = newTheme;
            injectCSS(newTheme);
        }
    };
})();