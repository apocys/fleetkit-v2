/**
 * SpawnKit Executive Office — "First 90 Seconds" Onboarding v2.1
 * Award-winning onboarding experience with channel connections. Self-contained IIFE.
 */

window.__skOnboardingV2 = true;

(function () {
  'use strict';

  // ── Guard ──────────────────────────────────────────────────────────────────
  var params = new URLSearchParams(window.location.search);
  if (params.has('skipOnboarding')) return;
  if (localStorage.getItem('spawnkit-onboarded') === 'true') return;

  // ── CSS ────────────────────────────────────────────────────────────────────
  var css = `
    @keyframes sk-ob-fadein {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes sk-ob-fadeout {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @keyframes sk-ob-logo-pop {
      0%   { opacity: 0; transform: scale(0.6) rotate(-8deg); }
      60%  { opacity: 1; transform: scale(1.08) rotate(2deg); }
      100% { opacity: 1; transform: scale(1) rotate(0deg); }
    }
    @keyframes sk-ob-slide-in {
      from { opacity: 0; transform: translateX(40px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes sk-ob-slide-out {
      from { opacity: 1; transform: translateX(0); }
      to   { opacity: 0; transform: translateX(-40px); }
    }
    @keyframes sk-ob-dots {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40%            { transform: scale(1);   opacity: 1; }
    }
    @keyframes sk-ob-card-stagger {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes sk-ob-confetti {
      0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
      100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
    }
    @keyframes sk-ob-celebration {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.06); }
      100% { transform: scale(1); }
    }
    @keyframes sk-ob-pulse-ring {
      0%   { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    @keyframes sk-ob-channel-card-appear {
      from { opacity: 0; transform: translateY(24px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes sk-ob-channel-card-glow {
      0%   { box-shadow: 0 0 0 rgba(0, 122, 255, 0); }
      50%  { box-shadow: 0 0 20px rgba(0, 122, 255, 0.3); }
      100% { box-shadow: 0 0 0 rgba(0, 122, 255, 0); }
    }
    @keyframes sk-ob-checkmark-draw {
      from { stroke-dashoffset: 16; }
      to   { stroke-dashoffset: 0; }
    }
    @keyframes sk-ob-mini-wizard-slide {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .sk-ob-overlay {
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, system-ui, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
      transition: opacity 0.3s ease;
    }
    .sk-ob-overlay.sk-ob-hiding {
      animation: sk-ob-fadeout 0.3s ease forwards;
    }

    /* Beat container */
    .sk-ob-beat {
      position: absolute; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      pointer-events: none; opacity: 0;
    }
    .sk-ob-beat.sk-ob-active {
      pointer-events: auto; opacity: 1;
    }
    .sk-ob-beat.sk-ob-entering {
      animation: sk-ob-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .sk-ob-beat.sk-ob-leaving {
      animation: sk-ob-slide-out 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    /* Card */
    .sk-ob-card {
      background: rgba(28, 28, 30, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 40px 36px 32px;
      width: 440px;
      max-width: calc(100vw - 40px);
      box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.04);
      position: relative;
    }

    /* Beat 1: Welcome */
    .sk-ob-welcome {
      text-align: center; padding: 56px 36px 48px;
    }
    .sk-ob-logo {
      width: 72px; height: 72px; margin: 0 auto 24px;
      background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
      border-radius: 20px;
      display: flex; align-items: center; justify-content: center;
      font-size: 36px;
      animation: sk-ob-logo-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      box-shadow: 0 8px 32px rgba(0, 122, 255, 0.35);
      position: relative;
    }
    .sk-ob-logo::after {
      content: '';
      position: absolute; inset: -8px;
      border-radius: 28px;
      border: 2px solid rgba(0, 122, 255, 0.3);
      animation: sk-ob-pulse-ring 2s ease-out infinite;
    }
    .sk-ob-welcome-title {
      font-size: 28px; font-weight: 700; color: #fff;
      margin: 0 0 12px; letter-spacing: -0.5px;
      animation: sk-ob-fadein 0.6s 0.2s ease both;
    }
    .sk-ob-welcome-sub {
      font-size: 15px; color: rgba(255,255,255,0.5);
      margin: 0 0 28px; line-height: 1.5;
      animation: sk-ob-fadein 0.6s 0.35s ease both;
    }
    .sk-ob-progress-bar {
      height: 3px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 28px;
      animation: sk-ob-fadein 0.4s 0.5s ease both;
    }
    .sk-ob-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #007AFF, #5856D6);
      border-radius: 2px;
      width: 0%;
      transition: width 3s linear;
    }
    .sk-ob-skip-link {
      display: block; margin-top: 16px;
      font-size: 13px; color: rgba(255,255,255,0.35);
      background: transparent; border: none; cursor: pointer;
      font-family: inherit;
      animation: sk-ob-fadein 0.4s 0.7s ease both;
      transition: color 0.2s ease;
    }
    .sk-ob-skip-link:hover { color: rgba(255,255,255,0.6); }

    /* Beat 2: Setup */
    .sk-ob-section-label {
      font-size: 11px; font-weight: 600; letter-spacing: 1px;
      color: rgba(255,255,255,0.35); text-transform: uppercase;
      margin: 0 0 6px;
    }
    .sk-ob-card-title {
      font-size: 22px; font-weight: 700; color: #fff;
      margin: 0 0 6px; letter-spacing: -0.4px;
    }
    .sk-ob-card-sub {
      font-size: 14px; color: rgba(255,255,255,0.45);
      margin: 0 0 28px; line-height: 1.5;
    }
    .sk-ob-field { margin-bottom: 16px; }
    .sk-ob-field label {
      display: block; font-size: 12px; font-weight: 500;
      color: rgba(255,255,255,0.5); margin-bottom: 8px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .sk-ob-input {
      width: 100%; box-sizing: border-box;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: #fff; border-radius: 12px;
      padding: 14px 16px; font-size: 16px;
      font-family: inherit; outline: none;
      transition: all 0.2s ease;
    }
    .sk-ob-input:focus {
      border-color: rgba(0, 122, 255, 0.6);
      background: rgba(0, 122, 255, 0.08);
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
    }
    .sk-ob-input::placeholder { color: rgba(255,255,255,0.25); }
    .sk-ob-actions {
      display: flex; align-items: center;
      justify-content: space-between; margin-top: 24px;
    }
    .sk-ob-btn-primary {
      background: #007AFF; color: #fff;
      border: none; border-radius: 12px;
      padding: 14px 24px; font-size: 15px; font-weight: 600;
      font-family: inherit; cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 16px rgba(0, 122, 255, 0.35);
    }
    .sk-ob-btn-primary:hover:not(:disabled) {
      background: #0066D6;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 122, 255, 0.45);
    }
    .sk-ob-btn-primary:active:not(:disabled) { transform: translateY(0); }
    .sk-ob-btn-primary:disabled {
      opacity: 0.4; cursor: not-allowed;
      box-shadow: none;
    }
    .sk-ob-btn-skip {
      background: transparent; border: none;
      color: rgba(255,255,255,0.45); font-size: 14px;
      font-family: inherit; cursor: pointer;
      padding: 12px 20px; transition: color 0.2s ease;
      position: relative; z-index: 10;
      -webkit-tap-highlight-color: rgba(255,255,255,0.1);
      touch-action: manipulation;
    }
    .sk-ob-btn-skip:hover, .sk-ob-btn-skip:active { color: rgba(255,255,255,0.75); }

    /* Beat 2.5: Channel Cards */
    #skObBeat25 .sk-ob-card {
      max-height: calc(100vh - 80px);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .sk-ob-channels-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 12px; margin: 24px 0;
    }
    .sk-ob-channel-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 16px 14px;
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 8px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0; transform: translateY(24px) scale(0.96);
      position: relative; overflow: hidden;
    }
    .sk-ob-channel-card.sk-ob-appearing {
      animation: sk-ob-channel-card-appear 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .sk-ob-channel-card:hover {
      transform: translateY(-2px) scale(1.02);
      border-color: rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.08);
    }
    .sk-ob-channel-card.sk-ob-connected {
      border-color: #34C759;
      background: rgba(52, 199, 89, 0.08);
      animation: sk-ob-channel-card-glow 1s ease;
    }
    .sk-ob-channel-card.sk-ob-connected:hover {
      border-color: #34C759;
      background: rgba(52, 199, 89, 0.12);
    }
    .sk-ob-channel-icon {
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
      position: relative;
    }
    .sk-ob-channel-icon.telegram { background: #0088CC; }
    .sk-ob-channel-icon.signal { background: #3A76F0; }
    .sk-ob-channel-icon.discord { background: #5865F2; }
    .sk-ob-channel-icon.imessage { background: #34C759; }
    .sk-ob-channel-icon.slack { background: #4A154B; }
    .sk-ob-channel-icon.whatsapp { background: #25D366; }
    .sk-ob-channel-name {
      font-size: 13px; font-weight: 600; color: #fff; margin: 0;
    }
    .sk-ob-channel-status {
      font-size: 11px; color: rgba(255,255,255,0.4); margin: 0;
    }
    .sk-ob-channel-status.sk-ob-connected { color: #34C759; }
    .sk-ob-channel-btn {
      background: rgba(0, 122, 255, 0.15); color: #007AFF;
      border: 1px solid rgba(0, 122, 255, 0.3);
      border-radius: 10px; padding: 8px 16px;
      font-size: 12px; font-weight: 600; font-family: inherit;
      cursor: pointer; transition: all 0.2s ease;
      margin-top: 4px; min-height: 36px;
      -webkit-tap-highlight-color: rgba(0, 122, 255, 0.3);
    }
    .sk-ob-channel-btn:hover, .sk-ob-channel-btn:active {
      background: rgba(0, 122, 255, 0.3);
      border-color: rgba(0, 122, 255, 0.6);
      transform: scale(0.97);
    }
    .sk-ob-channel-btn.sk-ob-connected {
      background: rgba(52, 199, 89, 0.15); color: #34C759;
      border-color: rgba(52, 199, 89, 0.3); cursor: default;
    }
    .sk-ob-checkmark {
      position: absolute; top: 8px; right: 8px;
      width: 16px; height: 16px; opacity: 0;
      transition: opacity 0.2s ease;
    }
    .sk-ob-connected .sk-ob-checkmark { opacity: 1; }
    .sk-ob-checkmark svg {
      width: 100%; height: 100%;
      stroke: #34C759; stroke-width: 2; fill: none;
      stroke-dasharray: 16; stroke-dashoffset: 16;
    }
    .sk-ob-connected .sk-ob-checkmark svg {
      animation: sk-ob-checkmark-draw 0.4s ease forwards;
    }

    /* Mini-wizards */
    .sk-ob-mini-wizard {
      display: none; margin-top: 20px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px; padding: 16px;
      animation: sk-ob-mini-wizard-slide 0.3s ease;
    }
    .sk-ob-mini-wizard.sk-ob-active { display: block; }
    .sk-ob-wizard-title {
      font-size: 14px; font-weight: 600; color: #fff;
      margin: 0 0 8px; display: flex; align-items: center; gap: 8px;
    }
    .sk-ob-wizard-desc {
      font-size: 12px; color: rgba(255,255,255,0.5);
      margin: 0 0 12px; line-height: 1.4;
    }
    .sk-ob-wizard-actions {
      display: flex; gap: 8px; align-items: center;
    }
    .sk-ob-copy-btn {
      background: rgba(0, 122, 255, 0.12); color: #007AFF;
      border: 1px solid rgba(0, 122, 255, 0.25);
      border-radius: 8px; padding: 6px 10px;
      font-size: 11px; font-weight: 500; font-family: 'SF Mono', Monaco, monospace;
      cursor: pointer; transition: all 0.2s ease;
      flex: 1; min-width: 0; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;
    }
    .sk-ob-copy-btn:hover {
      background: rgba(0, 122, 255, 0.18);
      border-color: rgba(0, 122, 255, 0.4);
    }
    .sk-ob-qr-placeholder {
      width: 80px; height: 80px; margin: 0 auto 8px;
      background: rgba(255,255,255,0.1);
      border: 1px dashed rgba(255,255,255,0.2);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; color: rgba(255,255,255,0.3);
    }
    .sk-ob-oauth-btn {
      background: #007AFF; color: #fff; border: none;
      border-radius: 8px; padding: 8px 16px;
      font-size: 12px; font-weight: 600; font-family: inherit;
      cursor: pointer; transition: all 0.2s ease;
      width: 100%;
    }
    .sk-ob-oauth-btn:hover {
      background: #0066D6;
      transform: translateY(-1px);
    }
    .sk-ob-requirement-note {
      background: rgba(255, 159, 0, 0.1);
      border: 1px solid rgba(255, 159, 0, 0.2);
      color: #FF9F00; font-size: 11px;
      padding: 8px 10px; border-radius: 6px; margin-top: 8px;
    }

    /* Beat 3: First Mission */
    .sk-ob-chat-bubble {
      background: rgba(0, 122, 255, 0.12);
      border: 1px solid rgba(0, 122, 255, 0.25);
      border-radius: 16px 16px 4px 16px;
      padding: 14px 16px; margin-bottom: 16px;
    }
    .sk-ob-chat-bubble p {
      margin: 0; font-size: 14px; color: rgba(255,255,255,0.75); line-height: 1.5;
    }
    .sk-ob-mission-input {
      width: 100%; box-sizing: border-box;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: #fff; border-radius: 12px;
      padding: 14px 16px; font-size: 15px;
      font-family: inherit; outline: none;
      transition: all 0.2s ease;
      resize: none; min-height: 56px;
    }
    .sk-ob-mission-input:focus {
      border-color: rgba(0, 122, 255, 0.5);
      background: rgba(0, 122, 255, 0.06);
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12);
    }
    .sk-ob-typing {
      display: flex; gap: 5px; align-items: center;
      padding: 10px 0; margin-bottom: 8px;
    }
    .sk-ob-typing span {
      width: 7px; height: 7px;
      background: rgba(255,255,255,0.45);
      border-radius: 50%;
      animation: sk-ob-dots 1.2s infinite ease-in-out;
    }
    .sk-ob-typing span:nth-child(2) { animation-delay: 0.2s; }
    .sk-ob-typing span:nth-child(3) { animation-delay: 0.4s; }
    .sk-ob-typing-label {
      font-size: 12px; color: rgba(255,255,255,0.35); margin-left: 6px;
    }
    .sk-ob-success {
      text-align: center; padding: 8px 0 4px;
    }
    .sk-ob-success-emoji {
      font-size: 40px; display: block; margin-bottom: 10px;
      animation: sk-ob-celebration 0.5s ease;
    }
    .sk-ob-success-title {
      font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 6px;
    }
    .sk-ob-success-sub {
      font-size: 14px; color: rgba(255,255,255,0.5); margin: 0 0 20px;
    }

    /* Beat 4: Feature Discovery */
    .sk-ob-features {
      display: grid; gap: 10px; margin: 20px 0 24px;
    }
    .sk-ob-feature-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px; padding: 14px 16px;
      display: flex; align-items: center; gap: 14px;
      opacity: 0;
    }
    .sk-ob-feature-card.sk-ob-visible {
      animation: sk-ob-card-stagger 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .sk-ob-feature-icon {
      font-size: 22px; width: 36px; text-align: center;
      flex-shrink: 0;
    }
    .sk-ob-feature-info h4 {
      margin: 0 0 2px; font-size: 14px; font-weight: 600; color: #fff;
    }
    .sk-ob-feature-info p {
      margin: 0; font-size: 12px; color: rgba(255,255,255,0.45);
    }
    .sk-ob-enter-btn {
      background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
      color: #fff; border: none; border-radius: 12px;
      padding: 15px 28px; font-size: 15px; font-weight: 600;
      font-family: inherit; cursor: pointer; width: 100%;
      transition: all 0.2s ease;
      box-shadow: 0 4px 20px rgba(0, 122, 255, 0.4);
    }
    .sk-ob-enter-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(0, 122, 255, 0.5);
    }
    .sk-ob-enter-btn:active { transform: translateY(0); }

    /* Confetti */
    .sk-ob-confetti-piece {
      position: fixed; width: 8px; height: 8px;
      border-radius: 2px; pointer-events: none; z-index: 10001;
      animation: sk-ob-confetti 2.5s ease-in forwards;
    }

    /* Step dots nav */
    .sk-ob-stepdots {
      display: flex; gap: 6px; justify-content: center;
      margin-bottom: 28px;
    }
    .sk-ob-stepdot {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(255,255,255,0.2); transition: all 0.3s ease;
    }
    .sk-ob-stepdot.sk-ob-stepdot-active {
      background: #007AFF; width: 18px; border-radius: 3px;
    }
  `;

  // ── Inject styles ──────────────────────────────────────────────────────────
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── State ──────────────────────────────────────────────────────────────────
  var currentBeat = 0;
  var overlay, beatEls;
  var confettiTimer = null;
  var connectedChannels = {};
  // Map beat number → array index (since we use non-sequential beat numbers)
  var beatMap = { 1: 0, 2: 1, 25: 2, 3: 3, 4: 4 };

  // ── Build DOM ──────────────────────────────────────────────────────────────
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'sk-ob-overlay';
    overlay.addEventListener('click', function(e) {
      console.log('[OB-DEBUG] overlay click:', e.target.tagName, e.target.id || e.target.className, 'x:', e.clientX, 'y:', e.clientY);
    }, true);
    overlay.addEventListener('touchstart', function(e) {
      console.log('[OB-DEBUG] overlay touchstart:', e.target.tagName, e.target.id || e.target.className);
    }, true);
    // Hide statusbar during onboarding to prevent z-index conflicts
    var statusBar = document.querySelector('.exec-statusbar');
    if (statusBar) statusBar.style.display = 'none';
    overlay.id = 'skObOverlay';

    // Beat 1: Welcome
    var b1 = makeBeat(1, `
      <div class="sk-ob-card sk-ob-welcome">
        <div class="sk-ob-logo">🏢</div>
        <h1 class="sk-ob-welcome-title">Welcome to Your AI Office</h1>
        <p class="sk-ob-welcome-sub">SpawnKit gives you a living command center<br>powered by a full AI executive team.</p>
        <div class="sk-ob-progress-bar">
          <div class="sk-ob-progress-fill" id="skObProgressFill"></div>
        </div>
        <button class="sk-ob-skip-link" id="skObSkipWelcome">Tap to continue →</button>
        <button class="sk-ob-skip-link" id="skObSkipAll" style="margin-top:8px;color:rgba(255,255,255,0.5);font-size:14px;font-weight:500;">Already set up? Skip →</button>
      </div>
    `);

    // Beat 2: Quick Setup
    var b2 = makeBeat(2, `
      <div class="sk-ob-card">
        <div class="sk-ob-stepdots">
          <div class="sk-ob-stepdot sk-ob-stepdot-active"></div>
          <div class="sk-ob-stepdot"></div>
          <div class="sk-ob-stepdot"></div>
          <div class="sk-ob-stepdot"></div>
        </div>
        <p class="sk-ob-section-label">Quick Setup</p>
        <h2 class="sk-ob-card-title">Make it yours</h2>
        <p class="sk-ob-card-sub">Personalize your office in seconds.</p>
        <div class="sk-ob-field">
          <label for="skObYourName">What should we call you?</label>
          <input class="sk-ob-input" id="skObYourName" type="text" placeholder="Your name" autocomplete="off" />
        </div>
        <div class="sk-ob-field">
          <label for="skObCeoName">Name your CEO agent</label>
          <input class="sk-ob-input" id="skObCeoName" type="text" placeholder="e.g. Atlas, Commander" autocomplete="off" />
        </div>
        <div class="sk-ob-actions">
          <button class="sk-ob-btn-skip" id="skObSkipSetup">Skip setup →</button>
          <button class="sk-ob-btn-primary" id="skObContinueSetup" disabled>Continue →</button>
        </div>
      </div>
    `);

    // Beat 2.5: Connect Your Channels
    var channelsHTML = `
      <div class="sk-ob-channel-card" data-channel="telegram">
        <div class="sk-ob-channel-icon telegram">💬</div>
        <h4 class="sk-ob-channel-name">Telegram</h4>
        <p class="sk-ob-channel-status">Not connected</p>
        <button class="sk-ob-channel-btn">Connect</button>
        <div class="sk-ob-checkmark">
          <svg viewBox="0 0 16 16">
            <path d="M3 8l3 3 7-7"></path>
          </svg>
        </div>
      </div>
      <div class="sk-ob-channel-card" data-channel="signal">
        <div class="sk-ob-channel-icon signal">🔒</div>
        <h4 class="sk-ob-channel-name">Signal</h4>
        <p class="sk-ob-channel-status">Not connected</p>
        <button class="sk-ob-channel-btn">Connect</button>
        <div class="sk-ob-checkmark">
          <svg viewBox="0 0 16 16">
            <path d="M3 8l3 3 7-7"></path>
          </svg>
        </div>
      </div>
      <div class="sk-ob-channel-card" data-channel="discord">
        <div class="sk-ob-channel-icon discord">🎮</div>
        <h4 class="sk-ob-channel-name">Discord</h4>
        <p class="sk-ob-channel-status">Not connected</p>
        <button class="sk-ob-channel-btn">Connect</button>
        <div class="sk-ob-checkmark">
          <svg viewBox="0 0 16 16">
            <path d="M3 8l3 3 7-7"></path>
          </svg>
        </div>
      </div>
      <div class="sk-ob-channel-card" data-channel="imessage">
        <div class="sk-ob-channel-icon imessage">💬</div>
        <h4 class="sk-ob-channel-name">iMessage</h4>
        <p class="sk-ob-channel-status">Not connected</p>
        <button class="sk-ob-channel-btn">Connect</button>
        <div class="sk-ob-checkmark">
          <svg viewBox="0 0 16 16">
            <path d="M3 8l3 3 7-7"></path>
          </svg>
        </div>
      </div>
      <div class="sk-ob-channel-card" data-channel="slack">
        <div class="sk-ob-channel-icon slack">💼</div>
        <h4 class="sk-ob-channel-name">Slack</h4>
        <p class="sk-ob-channel-status">Not connected</p>
        <button class="sk-ob-channel-btn">Connect</button>
        <div class="sk-ob-checkmark">
          <svg viewBox="0 0 16 16">
            <path d="M3 8l3 3 7-7"></path>
          </svg>
        </div>
      </div>
      <div class="sk-ob-channel-card" data-channel="whatsapp">
        <div class="sk-ob-channel-icon whatsapp">📱</div>
        <h4 class="sk-ob-channel-name">WhatsApp</h4>
        <p class="sk-ob-channel-status">Not connected</p>
        <button class="sk-ob-channel-btn">Connect</button>
        <div class="sk-ob-checkmark">
          <svg viewBox="0 0 16 16">
            <path d="M3 8l3 3 7-7"></path>
          </svg>
        </div>
      </div>
    `;

    var b25 = makeBeat(25, `
      <div class="sk-ob-card" style="width: 520px; padding: 36px 32px 28px;">
        <div class="sk-ob-stepdots">
          <div class="sk-ob-stepdot"></div>
          <div class="sk-ob-stepdot sk-ob-stepdot-active"></div>
          <div class="sk-ob-stepdot"></div>
          <div class="sk-ob-stepdot"></div>
        </div>
        <p class="sk-ob-section-label">Connect</p>
        <h2 class="sk-ob-card-title">Connect Your Channels</h2>
        <p class="sk-ob-card-sub">Choose where your team can reach you. All connections are optional.</p>
        <div class="sk-ob-channels-grid">
          ${channelsHTML}
        </div>
        
        <!-- Mini-wizards for each channel -->
        <div class="sk-ob-mini-wizard" id="skObWizardTelegram">
          <h4 class="sk-ob-wizard-title">💬 Connect Telegram</h4>
          <p class="sk-ob-wizard-desc">Add our bot to your group or start a private chat</p>
          <div class="sk-ob-wizard-actions">
            <button class="sk-ob-copy-btn" data-copy="@SpawnKit_bot">@SpawnKit_bot</button>
            <button class="sk-ob-oauth-btn" onclick="connectChannel('telegram')">Add Bot</button>
          </div>
        </div>
        
        <div class="sk-ob-mini-wizard" id="skObWizardSignal">
          <h4 class="sk-ob-wizard-title">🔒 Connect Signal</h4>
          <p class="sk-ob-wizard-desc">Scan QR code with Signal app to link your account</p>
          <div class="sk-ob-qr-placeholder">📱</div>
          <button class="sk-ob-oauth-btn" onclick="connectChannel('signal')">Generate QR Code</button>
        </div>
        
        <div class="sk-ob-mini-wizard" id="skObWizardDiscord">
          <h4 class="sk-ob-wizard-title">🎮 Connect Discord</h4>
          <p class="sk-ob-wizard-desc">Add SpawnKit bot to your Discord server</p>
          <button class="sk-ob-oauth-btn" onclick="connectChannel('discord')">Add to Discord</button>
        </div>
        
        <div class="sk-ob-mini-wizard" id="skObWizardImessage">
          <h4 class="sk-ob-wizard-title">💬 Connect iMessage</h4>
          <p class="sk-ob-wizard-desc">Enable secure iMessage bridge on your Mac</p>
          <div class="sk-ob-requirement-note">⚠️ Requires macOS 12+ and permissions</div>
          <button class="sk-ob-oauth-btn" onclick="connectChannel('imessage')">Enable Bridge</button>
        </div>
        
        <div class="sk-ob-mini-wizard" id="skObWizardSlack">
          <h4 class="sk-ob-wizard-title">💼 Connect Slack</h4>
          <p class="sk-ob-wizard-desc">Install SpawnKit app to your workspace</p>
          <button class="sk-ob-oauth-btn" onclick="connectChannel('slack')">Add to Slack</button>
        </div>
        
        <div class="sk-ob-mini-wizard" id="skObWizardWhatsapp">
          <h4 class="sk-ob-wizard-title">📱 Connect WhatsApp</h4>
          <p class="sk-ob-wizard-desc">Scan QR code with WhatsApp to connect</p>
          <div class="sk-ob-qr-placeholder">📱</div>
          <button class="sk-ob-oauth-btn" onclick="connectChannel('whatsapp')">Generate QR Code</button>
        </div>

        <div class="sk-ob-actions">
          <button class="sk-ob-btn-skip" id="skObSkipChannels">Skip for now →</button>
          <button class="sk-ob-btn-primary" id="skObContinueChannels">Continue →</button>
        </div>
      </div>
    `);

    // Beat 3: First Mission
    var b3 = makeBeat(3, `
      <div class="sk-ob-card" id="skObMissionCard">
        <div class="sk-ob-stepdots">
          <div class="sk-ob-stepdot"></div>
          <div class="sk-ob-stepdot"></div>
          <div class="sk-ob-stepdot sk-ob-stepdot-active"></div>
          <div class="sk-ob-stepdot"></div>
        </div>
        <p class="sk-ob-section-label">First Mission</p>
        <h2 class="sk-ob-card-title">Let's try your first mission</h2>
        <p class="sk-ob-card-sub">Send a message to your AI team. Edit or send as-is.</p>
        <div class="sk-ob-chat-bubble">
          <p>💡 Suggested mission:</p>
        </div>
        <textarea class="sk-ob-mission-input" id="skObMissionText" rows="2">What are our top priorities this week?</textarea>
        <div class="sk-ob-actions" style="margin-top:16px;">
          <span style="font-size:12px;color:rgba(255,255,255,0.3);">Your CEO agent will respond</span>
          <button class="sk-ob-btn-primary" id="skObSendMission">Send →</button>
        </div>
        <div id="skObTypingWrap" style="display:none;margin-top:12px;">
          <div class="sk-ob-typing">
            <span></span><span></span><span></span>
            <span class="sk-ob-typing-label">CEO is thinking…</span>
          </div>
        </div>
        <div id="skObSuccessWrap" style="display:none;">
          <div class="sk-ob-success">
            <span class="sk-ob-success-emoji">🎉</span>
            <p class="sk-ob-success-title">First Mission Complete!</p>
            <p class="sk-ob-success-sub">Your team is now working on it.</p>
          </div>
          <button class="sk-ob-btn-primary" id="skObMissionDone" style="width:100%;">Continue →</button>
        </div>
      </div>
    `);

    // Beat 4: Feature Discovery
    var features = [
      { icon: '📋', title: 'Mission Center', desc: 'Assign tasks to your team' },
      { icon: '🧠', title: 'Boardroom',      desc: 'Brainstorm with all agents' },
      { icon: '⚙️', title: 'Skills',          desc: 'Customize agent capabilities' },
      { icon: '⌨️', title: 'Command Palette', desc: 'Press Q to access anything' }
    ];
    var featureHTML = features.map(function(f, i) {
      return `<div class="sk-ob-feature-card" data-idx="${i}">
        <div class="sk-ob-feature-icon">${f.icon}</div>
        <div class="sk-ob-feature-info"><h4>${f.title}</h4><p>${f.desc}</p></div>
      </div>`;
    }).join('');
    var b4 = makeBeat(4, `
      <div class="sk-ob-card">
        <div class="sk-ob-stepdots">
          <div class="sk-ob-stepdot"></div>
          <div class="sk-ob-stepdot"></div>
          <div class="sk-ob-stepdot"></div>
          <div class="sk-ob-stepdot sk-ob-stepdot-active"></div>
        </div>
        <p class="sk-ob-section-label">Your Office</p>
        <h2 class="sk-ob-card-title">Everything you need</h2>
        <p class="sk-ob-card-sub">Here's what's waiting for you inside.</p>
        <div class="sk-ob-features">${featureHTML}</div>
        <button class="sk-ob-enter-btn" id="skObEnterOffice">Enter Your Office →</button>
      </div>
    `);

    overlay.appendChild(b1);
    overlay.appendChild(b2);
    overlay.appendChild(b25);
    overlay.appendChild(b3);
    overlay.appendChild(b4);

    document.body.appendChild(overlay);
    beatEls = [b1, b2, b25, b3, b4];
  }

  function makeBeat(num, html) {
    var el = document.createElement('div');
    el.className = 'sk-ob-beat';
    el.id = 'skObBeat' + num;
    el.innerHTML = html;
    return el;
  }

  // ── Beat transitions ───────────────────────────────────────────────────────
  function goToBeat(n) {
    console.log('[OB-DEBUG] goToBeat from:', currentBeat, 'to:', n);
    var fromIdx = beatMap[currentBeat];
    var toIdx = beatMap[n];
    var from = fromIdx !== undefined ? beatEls[fromIdx] : null;
    var to   = toIdx !== undefined ? beatEls[toIdx] : null;
    if (!to) { complete(); return; }

    if (from) {
      from.classList.add('sk-ob-leaving');
      // Use both animationend AND timeout fallback (in case animation doesn't fire)
      var fromCleaned = false;
      function cleanFrom() {
        if (fromCleaned) return;
        fromCleaned = true;
        from.classList.remove('sk-ob-active', 'sk-ob-leaving', 'sk-ob-entering');
      }
      from.addEventListener('animationend', function handler() {
        cleanFrom();
        from.removeEventListener('animationend', handler);
      });
      setTimeout(cleanFrom, 500); // Fallback
    }

    setTimeout(function() {
      to.classList.add('sk-ob-active', 'sk-ob-entering');
      var toCleaned = false;
      function cleanTo() {
        if (toCleaned) return;
        toCleaned = true;
        to.classList.remove('sk-ob-entering');
        if (n === 25) animateChannelCards();
        if (n === 4) animateFeatureCards();
      }
      to.addEventListener('animationend', function handler() {
        cleanTo();
        to.removeEventListener('animationend', handler);
      });
      setTimeout(cleanTo, 500); // Fallback
      currentBeat = n;
    }, from ? 200 : 0);
  }

  // ── Beat 1: Welcome logic ──────────────────────────────────────────────────
  function initBeat1() {
    var skipAllBtn = document.getElementById('skObSkipAll');
    if (skipAllBtn) {
      skipAllBtn.addEventListener('click', function() {
        localStorage.setItem('spawnkit-onboarded', 'true');
        var overlay = document.getElementById('skOnboardingOverlay');
        if (overlay) { overlay.style.opacity = '0'; setTimeout(function() { overlay.remove(); }, 300); }
        var sb = document.querySelector('.exec-statusbar'); if (sb) sb.style.display = '';
      });
    }
    beatEls[0].classList.add('sk-ob-active');
    currentBeat = 1;

    // Animate progress bar
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        var fill = document.getElementById('skObProgressFill');
        if (fill) fill.style.width = '100%';
      });
    });

    // Auto-advance after 3s
    var autoTimer = setTimeout(function() { goToBeat(2); }, 3000);

    var skipBtn = document.getElementById('skObSkipWelcome');
    if (skipBtn) {
      skipBtn.addEventListener('click', function() {
        clearTimeout(autoTimer);
        goToBeat(2);
      });
    }

    // Click anywhere on overlay to advance
    overlay.addEventListener('click', function onOverlayClick(e) {
      if (currentBeat !== 1) { overlay.removeEventListener('click', onOverlayClick); return; }
      clearTimeout(autoTimer);
      overlay.removeEventListener('click', onOverlayClick);
      goToBeat(2);
    });
  }

  // ── Beat 2: Setup logic ────────────────────────────────────────────────────
  function initBeat2() {
    var nameInput = document.getElementById('skObYourName');
    var ceoInput  = document.getElementById('skObCeoName');
    var continueBtn = document.getElementById('skObContinueSetup');
    var skipBtn   = document.getElementById('skObSkipSetup');

    function updateBtn() {
      continueBtn.disabled = !nameInput.value.trim();
    }
    if (nameInput) nameInput.addEventListener('input', updateBtn);

    if (continueBtn) {
      continueBtn.addEventListener('click', function() {
        saveConfig(nameInput.value.trim(), ceoInput.value.trim());
        goToBeat(25); // Go to channels step
      });
    }
    if (skipBtn) {
      console.log('[OB-DEBUG] skipBtn found, id:', skipBtn.id);
      skipBtn.addEventListener('click', function(e) { 
        console.log('[OB-DEBUG] SKIP SETUP CLICKED!', e.type, e.isTrusted);
        goToBeat(25); 
      });
      skipBtn.addEventListener('touchend', function(e) {
        console.log('[OB-DEBUG] SKIP SETUP TOUCHEND!');
        e.preventDefault();
        goToBeat(25);
      });
    } else {
      console.error('[OB-DEBUG] skipBtn #skObSkipSetup NOT FOUND!');
    }

    // Focus name input
    setTimeout(function() { if (nameInput) nameInput.focus(); }, 450);
  }

  function saveConfig(name, ceoName) {
    var cfg = { userName: name, ceoName: ceoName || 'Atlas', savedAt: Date.now() };
    localStorage.setItem('spawnkit-config', JSON.stringify(cfg));

    // Try to update agent name in the background UI if visible
    if (ceoName) {
      var ceoEls = document.querySelectorAll('[data-agent="ceo"] .agent-name, .agent-ceo .agent-name');
      ceoEls.forEach(function(el) { el.textContent = ceoName; });
    }
  }

  // ── Beat 2.5: Channel Connection logic ─────────────────────────────────────
  function animateChannelCards() {
    var cards = document.querySelectorAll('.sk-ob-channel-card');
    cards.forEach(function(card, i) {
      setTimeout(function() {
        card.classList.add('sk-ob-appearing');
      }, i * 120);
    });
  }

  // Mark a card as connected in the onboarding UI
  function markCardConnected(channel) {
    connectedChannels[channel] = true;
    var card = document.querySelector('.sk-ob-channel-card[data-channel="' + channel + '"]');
    if (card) {
      card.classList.add('sk-ob-connected');
      var status = card.querySelector('.sk-ob-channel-status');
      var btn = card.querySelector('.sk-ob-channel-btn');
      if (status) { status.textContent = 'Connected'; status.classList.add('sk-ob-connected'); }
      if (btn) { btn.textContent = '✓ Connected'; btn.classList.add('sk-ob-connected'); }
    }
  }

  // Pre-check which channels are already configured (server + localStorage)
  function preCheckChannels() {
    // 1. Check ChannelOnboarding localStorage
    if (window.ChannelOnboarding && window.ChannelOnboarding.getConnectedChannels) {
      var saved = window.ChannelOnboarding.getConnectedChannels();
      saved.forEach(function(ch) { markCardConnected(ch.id); });
    }

    // 2. Check server-side (async, updates cards when response arrives)
    fetch('/api/oc/channels/status').then(function(r) { return r.json(); }).then(function(data) {
      if (data.channels && Array.isArray(data.channels)) {
        data.channels.forEach(function(ch) {
          if (ch.connected) markCardConnected(ch.id);
        });
      }
    }).catch(function() { /* silent — offline or no server */ });

    // 3. Check OpenClaw config for already-active channels
    fetch('/api/oc/config').then(function(r) { return r.json(); }).then(function(cfg) {
      if (cfg.channels) {
        Object.keys(cfg.channels).forEach(function(id) {
          if (cfg.channels[id] && cfg.channels[id].enabled !== false) {
            markCardConnected(id);
          }
        });
      }
    }).catch(function() { /* silent */ });
  }

  function initBeat25() {
    var continueBtn = document.getElementById('skObContinueChannels');
    var skipBtn = document.getElementById('skObSkipChannels');

    if (continueBtn) {
      continueBtn.addEventListener('click', function() { goToBeat(3); });
    }
    if (skipBtn) {
      skipBtn.addEventListener('click', function() { goToBeat(3); });
    }

    // Pre-check already-configured channels
    preCheckChannels();

    // Channel card click → open REAL ChannelOnboarding wizard
    var cards = document.querySelectorAll('.sk-ob-channel-card');
    cards.forEach(function(card) {
      var channel = card.getAttribute('data-channel');

      card.addEventListener('click', function() {
        // Already connected → do nothing (or could offer reconnect)
        if (connectedChannels[channel]) return;

        // Open the real OAuth wizard
        if (window.ChannelOnboarding && window.ChannelOnboarding.open) {
          window.ChannelOnboarding.open(channel);

          // Watch for wizard closing → check if channel got connected
          var checkInterval = setInterval(function() {
            // Wizard closed when overlay is gone
            var wizardOverlay = document.querySelector('.sk-cw-overlay');
            if (!wizardOverlay) {
              clearInterval(checkInterval);
              // Check if channel is now connected
              if (window.ChannelOnboarding.isChannelConnected && window.ChannelOnboarding.isChannelConnected(channel)) {
                markCardConnected(channel);
              }
            }
          }, 300);
        }
      });
    });

    // Legacy global connectChannel for any inline onclick attributes
    window.connectChannel = function(channel) {
      if (window.ChannelOnboarding && window.ChannelOnboarding.open) {
        window.ChannelOnboarding.open(channel);
      } else {
        markCardConnected(channel);
      }
    };
  }

  // ── Beat 3: First Mission logic ────────────────────────────────────────────
  function initBeat3() {
    var sendBtn     = document.getElementById('skObSendMission');
    var missionText = document.getElementById('skObMissionText');
    var typingWrap  = document.getElementById('skObTypingWrap');
    var successWrap = document.getElementById('skObSuccessWrap');
    var doneBtn     = document.getElementById('skObMissionDone');

    if (sendBtn) {
      sendBtn.addEventListener('click', function() {
        var msg = missionText ? missionText.value.trim() : 'What are our top priorities this week?';
        if (!msg) return;

        // Send to actual chat
        trySendToChat(msg);

        // Show typing indicator
        sendBtn.disabled = true;
        if (missionText) missionText.disabled = true;
        if (typingWrap) typingWrap.style.display = 'block';

        // After 3s show success + confetti
        setTimeout(function() {
          if (typingWrap) typingWrap.style.display = 'none';
          if (successWrap) successWrap.style.display = 'block';
          launchConfetti();
        }, 3000);
      });
    }

    if (doneBtn) {
      doneBtn.addEventListener('click', function() {
        stopConfetti();
        goToBeat(4);
      });
    }
  }

  function trySendToChat(msg) {
    try {
      var input = document.getElementById('chatTabInput');
      if (input && typeof window.sendChatTabMessage === 'function') {
        input.value = msg;
        window.sendChatTabMessage();
      }
    } catch(e) {
      // Silent fail — onboarding is cosmetic
    }
  }

  // ── Beat 4: Feature cards ──────────────────────────────────────────────────
  function animateFeatureCards() {
    var cards = document.querySelectorAll('.sk-ob-feature-card');
    cards.forEach(function(card, i) {
      setTimeout(function() {
        card.classList.add('sk-ob-visible');
      }, i * 150);
    });
  }

  function initBeat4() {
    var enterBtn = document.getElementById('skObEnterOffice');
    if (enterBtn) {
      enterBtn.addEventListener('click', function() { complete(); });
    }
  }

  // ── Confetti ───────────────────────────────────────────────────────────────
  var confettiPieces = [];
  var confettiColors = ['#007AFF','#34C759','#FF9500','#FF2D55','#5856D6','#FFCC00'];

  function launchConfetti() {
    for (var i = 0; i < 50; i++) {
      (function(idx) {
        setTimeout(function() {
          var piece = document.createElement('div');
          piece.className = 'sk-ob-confetti-piece';
          piece.style.left  = Math.random() * 100 + 'vw';
          piece.style.top   = (Math.random() * 30 - 10) + 'vh';
          piece.style.background = confettiColors[idx % confettiColors.length];
          piece.style.animationDuration = (1.8 + Math.random() * 1.5) + 's';
          piece.style.animationDelay    = (Math.random() * 0.8) + 's';
          piece.style.width  = (6 + Math.random() * 6) + 'px';
          piece.style.height = (6 + Math.random() * 10) + 'px';
          document.body.appendChild(piece);
          confettiPieces.push(piece);
          piece.addEventListener('animationend', function() {
            if (piece.parentNode) piece.parentNode.removeChild(piece);
          });
        }, idx * 30);
      })(i);
    }
  }

  function stopConfetti() {
    confettiPieces.forEach(function(p) {
      if (p.parentNode) p.parentNode.removeChild(p);
    });
    confettiPieces = [];
  }

  // ── Complete ───────────────────────────────────────────────────────────────
  function complete() {
    stopConfetti();
    localStorage.setItem('spawnkit-onboarded', 'true');
    // Restore statusbar
    var statusBar = document.querySelector('.exec-statusbar');
    if (statusBar) statusBar.style.display = '';
    overlay.classList.add('sk-ob-hiding');
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 320);
    // Close Deploy Wizard if still open (z-index stacking issue)
    if (window.DeployWizard) window.DeployWizard.close();
    // Resolve auth gate if waiting
    if (typeof window.__skAuthResolve === 'function') {
      window.__skAuthResolve();
      window.__skAuthResolve = null;
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  var _initDone = false;
  function init() {
    // Skip if already onboarded
    if (localStorage.getItem('spawnkit-onboarded') === 'true') return;
    // Guard: prevent double init (skAuthResolved + fallback both fire)
    if (_initDone) { console.log('[OB-DEBUG] init() already ran, skipping duplicate'); return; }
    _initDone = true;
    buildOverlay();
    console.log('[OB-DEBUG] init() starting. beatEls:', beatEls.length);
    initBeat1();
    initBeat2();
    initBeat25(); // Initialize channels step
    initBeat3();
    initBeat4();
  }

  // Wait for auth gate to resolve before showing onboarding.
  // This prevents stacking with deploy-wizard overlay.
  // Listen for custom event dispatched after auth resolves.
  window.addEventListener('skAuthResolved', function() {
    if (localStorage.getItem('spawnkit-onboarded') !== 'true') {
      setTimeout(init, 300); // Small delay for smooth transition
    }
  });

  // Fallback: if auth already resolved (e.g. returning user with token), 
  // init normally after short delay
  if (localStorage.getItem('spawnkit-onboarded') !== 'true' && localStorage.getItem('spawnkit-token')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 500); });
    } else {
      setTimeout(init, 500);
    }
  }

})();