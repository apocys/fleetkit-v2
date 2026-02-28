/**
 * SpawnKit Medieval Castle — Onboarding Experience v2
 * Fantasy RPG parchment-themed first-run walkthrough
 */

window.__skOnboardingV2 = true;

(function () {
  'use strict';

  // ─── Guards ───────────────────────────────────────────────────────────────
  if (localStorage.getItem('spawnkit-onboarded-medieval') === 'true') return;
  if (new URLSearchParams(window.location.search).has('skipOnboarding')) return;

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

    /* Base overlay */
    .sk-med-ob-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(20,12,5,0.92);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Crimson Text', Georgia, 'Times New Roman', serif;
      color: #F5E6D0;
      transition: opacity 0.6s ease;
    }
    .sk-med-ob-overlay.sk-med-ob-hidden {
      opacity: 0;
      pointer-events: none;
    }

    /* Parchment texture glow */
    .sk-med-ob-overlay::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 70% 60% at 50% 50%, rgba(200,140,40,0.08) 0%, transparent 70%),
        radial-gradient(ellipse 40% 30% at 20% 80%, rgba(139,105,20,0.06) 0%, transparent 60%),
        radial-gradient(ellipse 40% 30% at 80% 20%, rgba(139,105,20,0.06) 0%, transparent 60%);
      pointer-events: none;
    }

    /* Beats container */
    .sk-med-ob-beat {
      position: relative;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 640px;
      padding: 24px;
      animation: sk-med-ob-fadein 0.5s ease;
    }
    .sk-med-ob-beat.sk-med-ob-active { display: flex; }

    @keyframes sk-med-ob-fadein {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Beat 1: Herald ── */
    .sk-med-ob-herald-wrap {
      text-align: center;
      max-width: 560px;
    }
    .sk-med-ob-herald-line1 {
      font-family: 'Cinzel', Georgia, serif;
      font-size: clamp(18px, 3vw, 26px);
      color: #C4A24D;
      letter-spacing: 2px;
      margin-bottom: 24px;
      min-height: 2em;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .sk-med-ob-herald-line2 {
      font-family: 'Cinzel', Georgia, serif;
      font-size: clamp(24px, 5vw, 48px);
      font-weight: 700;
      color: #F5E6D0;
      letter-spacing: 3px;
      line-height: 1.2;
      opacity: 0;
      transition: opacity 0.8s ease;
    }
    .sk-med-ob-herald-line2.sk-med-ob-show { opacity: 1; }
    .sk-med-ob-herald-divider {
      width: 120px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #8B6914, transparent);
      margin: 20px auto;
      opacity: 0;
      transition: opacity 0.8s ease 0.3s;
    }
    .sk-med-ob-herald-divider.sk-med-ob-show { opacity: 1; }
    .sk-med-ob-herald-sub {
      font-size: 14px;
      color: #A89070;
      letter-spacing: 4px;
      text-transform: uppercase;
      opacity: 0;
      transition: opacity 0.8s ease 0.6s;
    }
    .sk-med-ob-herald-sub.sk-med-ob-show { opacity: 1; }

    /* Typewriter cursor */
    .sk-med-ob-cursor {
      display: inline-block;
      width: 2px;
      height: 1.1em;
      background: #C4A24D;
      margin-left: 3px;
      vertical-align: middle;
      animation: sk-med-ob-blink 0.8s step-end infinite;
    }
    @keyframes sk-med-ob-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    /* ── Parchment Card ── */
    .sk-med-ob-card {
      background: linear-gradient(135deg, #F5E6D0 0%, #EDD9B5 50%, #E4CFA0 100%);
      border: 2px solid #8B6914;
      border-radius: 8px;
      box-shadow:
        0 4px 20px rgba(0,0,0,0.6),
        inset 0 1px 0 rgba(255,255,255,0.3),
        inset 0 -1px 0 rgba(0,0,0,0.1);
      padding: 36px 40px;
      width: 100%;
      max-width: 520px;
      color: #3D2B1F;
      position: relative;
    }
    .sk-med-ob-card::before {
      content: '';
      position: absolute;
      inset: 4px;
      border: 1px solid rgba(139,105,20,0.3);
      border-radius: 5px;
      pointer-events: none;
    }
    .sk-med-ob-card-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: clamp(18px, 3vw, 24px);
      font-weight: 700;
      color: #5D1A00;
      text-align: center;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    .sk-med-ob-card-subtitle {
      font-size: 13px;
      color: #8B6914;
      text-align: center;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 28px;
    }
    .sk-med-ob-field {
      margin-bottom: 20px;
    }
    .sk-med-ob-label {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 13px;
      color: #5D4E37;
      margin-bottom: 8px;
      display: block;
      font-weight: 600;
    }
    .sk-med-ob-input {
      width: 100%;
      background: rgba(139,105,20,0.08);
      border: 2px solid #C4A24D;
      border-radius: 6px;
      padding: 10px 14px;
      font-family: 'Crimson Text', Georgia, serif;
      font-size: 16px;
      color: #3D2B1F;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .sk-med-ob-input:focus {
      border-color: #8B6914;
      box-shadow: 0 0 0 3px rgba(139,105,20,0.15);
    }
    .sk-med-ob-input::placeholder { color: #A8906A; }

    /* Buttons */
    .sk-med-ob-btn {
      background: linear-gradient(180deg, #A07820 0%, #8B6914 60%, #7A5C10 100%);
      color: #FFF8E8;
      border: none;
      border-radius: 6px;
      padding: 12px 28px;
      font-family: 'Cinzel', Georgia, serif;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
      transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
      width: 100%;
      margin-top: 8px;
    }
    .sk-med-ob-btn:hover {
      background: linear-gradient(180deg, #B08830 0%, #9B7924 60%, #8A6A18 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25);
    }
    .sk-med-ob-btn:active { transform: translateY(0); }
    .sk-med-ob-btn-ghost {
      background: transparent;
      color: #8B6914;
      border: none;
      font-family: 'Crimson Text', Georgia, serif;
      font-size: 14px;
      cursor: pointer;
      padding: 8px 0;
      margin-top: 12px;
      width: 100%;
      text-align: center;
      transition: color 0.2s;
      text-decoration: none;
      display: block;
    }
    .sk-med-ob-btn-ghost:hover { color: #5D4E37; }

    /* Scroll textarea (Beat 3) */
    .sk-med-ob-scroll-wrap {
      background: linear-gradient(180deg, #EDD5A0 0%, #E4C88A 100%);
      border: 2px solid #8B6914;
      border-radius: 4px;
      padding: 16px;
      position: relative;
      margin: 16px 0;
    }
    .sk-med-ob-scroll-wrap::before,
    .sk-med-ob-scroll-wrap::after {
      content: '⊱ ❧ ⊰';
      display: block;
      text-align: center;
      color: #8B6914;
      font-size: 12px;
      letter-spacing: 4px;
    }
    .sk-med-ob-scroll-wrap::before { margin-bottom: 8px; }
    .sk-med-ob-scroll-wrap::after { margin-top: 8px; }
    .sk-med-ob-decree-input {
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      font-family: 'Crimson Text', Georgia, serif;
      font-size: 17px;
      color: #3D2B1F;
      font-style: italic;
      resize: none;
      text-align: center;
      box-sizing: border-box;
      min-height: 60px;
    }

    /* Loading state */
    .sk-med-ob-loading {
      text-align: center;
      padding: 20px;
      color: #C4A24D;
      font-style: italic;
      font-size: 15px;
      display: none;
    }
    .sk-med-ob-loading.sk-med-ob-active { display: block; }
    .sk-med-ob-loading::after {
      content: '';
      animation: sk-med-ob-dots 1.5s infinite;
    }
    @keyframes sk-med-ob-dots {
      0%   { content: ''; }
      25%  { content: '.'; }
      50%  { content: '..'; }
      75%  { content: '...'; }
      100% { content: ''; }
    }

    /* Banner (Beat 3 celebration) */
    .sk-med-ob-banner {
      background: #8B1A1A;
      border: 3px solid #C4A24D;
      border-radius: 6px;
      color: #FFF8E8;
      text-align: center;
      padding: 0 20px;
      font-family: 'Cinzel', Georgia, serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
      overflow: hidden;
      height: 0;
      opacity: 0;
      transition: height 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease, padding 0.4s ease;
      margin: 12px 0;
    }
    .sk-med-ob-banner.sk-med-ob-unfurl {
      height: 64px;
      opacity: 1;
      padding: 16px 20px;
    }

    /* ── Beat 4: Feature Cards ── */
    .sk-med-ob-cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin: 20px 0;
    }
    .sk-med-ob-feature-card {
      background: linear-gradient(135deg, #F5E6D0, #E8D5B8);
      border: 2px solid #8B6914;
      border-radius: 8px;
      padding: 18px 16px;
      color: #3D2B1F;
      box-shadow: 0 3px 12px rgba(0,0,0,0.4);
      opacity: 0;
      transform: scaleY(0.6) translateY(-10px);
      transform-origin: top center;
      transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }
    .sk-med-ob-feature-card.sk-med-ob-unroll {
      opacity: 1;
      transform: scaleY(1) translateY(0);
    }
    .sk-med-ob-feature-card-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }
    .sk-med-ob-feature-card-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 13px;
      font-weight: 700;
      color: #5D1A00;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .sk-med-ob-feature-card-desc {
      font-size: 13px;
      color: #5D4E37;
      line-height: 1.4;
    }

    /* Beat 4 header in overlay */
    .sk-med-ob-overlay-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: clamp(20px, 3.5vw, 30px);
      font-weight: 700;
      color: #C4A24D;
      text-align: center;
      letter-spacing: 2px;
      margin-bottom: 6px;
    }
    .sk-med-ob-overlay-sub {
      font-size: 14px;
      color: #A89070;
      text-align: center;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 24px;
    }

    /* Burn-out dissolve */
    @keyframes sk-med-ob-burn {
      0%   { opacity: 1; box-shadow: inset 0 0 0 0 transparent; }
      40%  { opacity: 0.7; box-shadow: inset 0 0 120px 40px rgba(255,120,20,0.4); }
      80%  { opacity: 0.2; box-shadow: inset 0 0 200px 80px rgba(255,60,0,0.2); }
      100% { opacity: 0; }
    }
    .sk-med-ob-burning {
      animation: sk-med-ob-burn 1.2s ease forwards;
      pointer-events: none;
    }

    /* Progress dots */
    .sk-med-ob-progress {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
    }
    .sk-med-ob-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(196,162,77,0.3);
      border: 1px solid #8B6914;
      transition: background 0.3s;
    }
    .sk-med-ob-dot.sk-med-ob-dot-active { background: #C4A24D; }

    /* Corner decorations */
    .sk-med-ob-corners {
      position: absolute;
      inset: 12px;
      pointer-events: none;
    }
    .sk-med-ob-corners::before,
    .sk-med-ob-corners::after {
      content: '✦';
      position: absolute;
      color: rgba(196,162,77,0.2);
      font-size: 32px;
    }
    .sk-med-ob-corners::before { top: 0; left: 0; }
    .sk-med-ob-corners::after  { bottom: 0; right: 0; }
  `;
  document.head.appendChild(style);

  // ─── State ────────────────────────────────────────────────────────────────
  let currentBeat = 0;
  let overlay, beats;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function el(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.assign(e, attrs);
    return e;
  }

  function goToBeat(n) {
    beats.forEach((b, i) => {
      b.classList.toggle('sk-med-ob-active', i === n);
    });
    // Update progress dots
    const dots = overlay.querySelectorAll('.sk-med-ob-dot');
    dots.forEach((d, i) => d.classList.toggle('sk-med-ob-dot-active', i === n));
    currentBeat = n;
  }

  // ─── Beat 1: Herald's Announcement ───────────────────────────────────────
  function buildBeat1() {
    const beat = el('div', 'sk-med-ob-beat');

    const wrap = el('div', 'sk-med-ob-herald-wrap');

    const line1 = el('div', 'sk-med-ob-herald-line1');
    const cursor = el('span', 'sk-med-ob-cursor');
    line1.appendChild(cursor);
    wrap.appendChild(line1);

    const divider = el('div', 'sk-med-ob-herald-divider');
    wrap.appendChild(divider);

    const line2 = el('div', 'sk-med-ob-herald-line2');
    line2.textContent = 'Welcome to Castle SpawnKit';
    wrap.appendChild(line2);

    const sub = el('div', 'sk-med-ob-herald-sub');
    sub.textContent = 'Your AI Court Awaits';
    wrap.appendChild(sub);

    beat.appendChild(wrap);

    // Click to skip
    beat.addEventListener('click', function onBeat1Click() {
      beat.removeEventListener('click', onBeat1Click);
      clearTimeout(beat._autoTimer);
      goToBeat(1);
    });

    // Typewriter
    const fullText = '⚔️ A new lord approaches the realm...';
    let i = 0;
    function typeNext() {
      if (i < fullText.length) {
        const chars = [...fullText]; // handle emoji correctly
        const sliced = chars.slice(0, i + 1).join('');
        line1.textContent = sliced;
        line1.appendChild(cursor);
        i++;
        setTimeout(typeNext, i === 1 ? 200 : 55);
      } else {
        // Show rest
        setTimeout(() => {
          line2.classList.add('sk-med-ob-show');
          divider.classList.add('sk-med-ob-show');
          sub.classList.add('sk-med-ob-show');
        }, 400);

        beat._autoTimer = setTimeout(() => goToBeat(1), 2800);
      }
    }

    beat._init = function () { setTimeout(typeNext, 700); };
    return beat;
  }

  // ─── Beat 2: Name Your Character ─────────────────────────────────────────
  function buildBeat2() {
    const beat = el('div', 'sk-med-ob-beat');

    const card = el('div', 'sk-med-ob-card');

    const title = el('div', 'sk-med-ob-card-title');
    title.textContent = '📜 Enter the Realm';
    card.appendChild(title);

    const sub = el('div', 'sk-med-ob-card-subtitle');
    sub.textContent = '✦ Identify yourself, Liege ✦';
    card.appendChild(sub);

    const field1 = el('div', 'sk-med-ob-field');
    const label1 = el('label', 'sk-med-ob-label');
    label1.textContent = 'How shall the realm know you, my Lord?';
    const nameInput = el('input', 'sk-med-ob-input');
    nameInput.type = 'text';
    nameInput.placeholder = 'e.g. Kira of the North';
    nameInput.maxLength = 40;
    field1.appendChild(label1);
    field1.appendChild(nameInput);
    card.appendChild(field1);

    const field2 = el('div', 'sk-med-ob-field');
    const label2 = el('label', 'sk-med-ob-label');
    label2.textContent = 'What title shall your commander bear?';
    const ceoInput = el('input', 'sk-med-ob-input');
    ceoInput.type = 'text';
    ceoInput.placeholder = 'e.g. Sir Atlas, Lord Commander';
    ceoInput.maxLength = 50;
    field2.appendChild(label2);
    field2.appendChild(ceoInput);
    card.appendChild(field2);

    const proceedBtn = el('button', 'sk-med-ob-btn');
    proceedBtn.textContent = '⚜ Proceed to the Realm';
    card.appendChild(proceedBtn);

    const skipLink = el('a', 'sk-med-ob-btn-ghost');
    skipLink.textContent = 'Skip to the realm →';
    skipLink.href = '#';
    card.appendChild(skipLink);

    proceedBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      const ceo = ceoInput.value.trim();
      if (name) {
        localStorage.setItem('spawnkit-user-name', name);
        document.title = `${name}'s Castle — SpawnKit`;
      }
      if (ceo) localStorage.setItem('spawnkit-commander-name', ceo);
      goToBeat(2);
    });

    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      goToBeat(2);
    });

    beat.appendChild(card);
    return beat;
  }

  // ─── Beat 3: First Decree ─────────────────────────────────────────────────
  function buildBeat3() {
    const beat = el('div', 'sk-med-ob-beat');

    const card = el('div', 'sk-med-ob-card');

    const title = el('div', 'sk-med-ob-card-title');
    title.textContent = '⚔️ Issue Your First Decree';
    card.appendChild(title);

    const sub = el('div', 'sk-med-ob-card-subtitle');
    sub.textContent = '✦ Your court stands ready ✦';
    card.appendChild(sub);

    const scrollWrap = el('div', 'sk-med-ob-scroll-wrap');
    const decreeInput = el('textarea', 'sk-med-ob-decree-input');
    decreeInput.value = 'Survey the defenses of our northern border';
    decreeInput.rows = 2;
    scrollWrap.appendChild(decreeInput);
    card.appendChild(scrollWrap);

    const issueBtn = el('button', 'sk-med-ob-btn');
    issueBtn.textContent = '📯 Issue Decree';
    card.appendChild(issueBtn);

    const loading = el('div', 'sk-med-ob-loading');
    loading.textContent = '🔮 The court wizard consults the ancient texts';
    card.appendChild(loading);

    const banner = el('div', 'sk-med-ob-banner');
    banner.textContent = '🏰 Your first decree has been carried out!';
    card.appendChild(banner);

    const continueBtn = el('button', 'sk-med-ob-btn');
    continueBtn.textContent = '⚜ Continue';
    continueBtn.style.display = 'none';
    card.appendChild(continueBtn);

    issueBtn.addEventListener('click', () => {
      const decree = decreeInput.value.trim() || 'Survey the defenses of our northern border';

      issueBtn.disabled = true;
      issueBtn.style.opacity = '0.6';
      loading.classList.add('sk-med-ob-active');

      // Try to send to chat system
      let sent = false;
      if (typeof window.sendChatTabMessage === 'function') {
        try { window.sendChatTabMessage(decree); sent = true; } catch (e) { /* noop */ }
      }
      if (!sent) {
        const chatInput = document.querySelector('#chatTabInput, [data-role="chat-input"], .chat-input, #chat-input');
        if (chatInput) {
          chatInput.value = decree;
          chatInput.dispatchEvent(new Event('input', { bubbles: true }));
          const sendBtn = document.querySelector('#chatSendBtn, [data-role="send"], .send-btn');
          if (sendBtn) { sendBtn.click(); sent = true; }
          if (!sent) {
            chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
            sent = true;
          }
        }
      }
      if (!sent) {
        // Fallback: dispatch custom event
        window.dispatchEvent(new CustomEvent('sk:sendMessage', { detail: { message: decree } }));
      }

      // Simulate waiting for response (3.5s mock, or listen for reply)
      const resolveDecree = () => {
        loading.classList.remove('sk-med-ob-active');
        banner.classList.add('sk-med-ob-unfurl');
        continueBtn.style.display = 'block';
        continueBtn.addEventListener('click', () => goToBeat(3), { once: true });
      };

      // Listen for any chat response event, fallback to timeout
      let resolved = false;
      const onReply = () => {
        if (!resolved) { resolved = true; resolveDecree(); }
        window.removeEventListener('sk:agentReply', onReply);
      };
      window.addEventListener('sk:agentReply', onReply);
      setTimeout(() => { if (!resolved) { resolved = true; resolveDecree(); } }, 4500);
    });

    beat.appendChild(card);
    return beat;
  }

  // ─── Beat 4: Know Your Court ──────────────────────────────────────────────
  function buildBeat4() {
    const beat = el('div', 'sk-med-ob-beat');
    beat.style.maxWidth = '680px';

    const titleEl = el('div', 'sk-med-ob-overlay-title');
    titleEl.textContent = '🏰 Know Your Court';
    beat.appendChild(titleEl);

    const subEl = el('div', 'sk-med-ob-overlay-sub');
    subEl.textContent = '✦ The realm at your command ✦';
    beat.appendChild(subEl);

    const grid = el('div', 'sk-med-ob-cards-grid');

    const features = [
      { icon: '⚔️', title: 'War Room', desc: 'Plan campaigns and missions with your commanders' },
      { icon: '📜', title: 'Royal Decrees', desc: 'Issue orders to your court and track their progress' },
      { icon: '🔮', title: 'Court Wizard', desc: 'Enchant your agents with new skills and knowledge' },
      { icon: '🗝️', title: 'Command Scroll', desc: 'Press Q to open the command scroll at any time' },
    ];

    features.forEach((f, i) => {
      const card = el('div', 'sk-med-ob-feature-card');
      const icon = el('div', 'sk-med-ob-feature-card-icon');
      icon.textContent = f.icon;
      const ftitle = el('div', 'sk-med-ob-feature-card-title');
      ftitle.textContent = f.title;
      const fdesc = el('div', 'sk-med-ob-feature-card-desc');
      fdesc.textContent = f.desc;
      card.appendChild(icon);
      card.appendChild(ftitle);
      card.appendChild(fdesc);
      grid.appendChild(card);

      // Staggered unroll animation on activation
      card._stagger = i * 120;
    });

    beat.appendChild(grid);

    const enterBtn = el('button', 'sk-med-ob-btn');
    enterBtn.style.maxWidth = '320px';
    enterBtn.textContent = '🏰 Enter the Castle →';
    enterBtn.addEventListener('click', () => complete());
    beat.appendChild(enterBtn);

    beat._init = function () {
      const cards = grid.querySelectorAll('.sk-med-ob-feature-card');
      cards.forEach((c) => {
        setTimeout(() => c.classList.add('sk-med-ob-unroll'), c._stagger || 0);
      });
    };

    return beat;
  }

  // ─── Complete ─────────────────────────────────────────────────────────────
  function complete() {
    localStorage.setItem('spawnkit-onboarded-medieval', 'true');
    overlay.classList.add('sk-med-ob-burning');
    setTimeout(() => {
      overlay.remove();
    }, 1300);
  }

  // ─── Build & Mount ────────────────────────────────────────────────────────
  function init() {
    overlay = el('div', 'sk-med-ob-overlay');

    // Corner decorations
    overlay.appendChild(el('div', 'sk-med-ob-corners'));

    // Build beats
    const beat1 = buildBeat1();
    const beat2 = buildBeat2();
    const beat3 = buildBeat3();
    const beat4 = buildBeat4();
    beats = [beat1, beat2, beat3, beat4];
    beats.forEach(b => overlay.appendChild(b));

    // Progress dots (4 beats)
    const progressBar = el('div', 'sk-med-ob-progress');
    for (let i = 0; i < 4; i++) {
      const dot = el('div', 'sk-med-ob-dot');
      progressBar.appendChild(dot);
    }
    overlay.appendChild(progressBar);

    document.body.appendChild(overlay);

    // Patch goToBeat to fire _init hooks after transition
    const _baseGoTo = goToBeat;
    goToBeat = function (n) {
      _baseGoTo(n);
      const b = beats[n];
      if (b && b._init) b._init();
    };

    // Start
    goToBeat(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
