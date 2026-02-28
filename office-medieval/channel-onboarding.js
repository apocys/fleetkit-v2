/**
 * SpawnKit — Channel Connection Wizard v2
 * Awwwards-level OAuth bridge + guided setup wizard
 * Real server-side verification, zero CLI exposure
 * Self-contained IIFE, drop-in replacement
 */

window.__skChannelOnboarding = true;

(function () {
  'use strict';

  // ── Channel Registry ───────────────────────────────────────────────────────
  var CHANNELS = {
    telegram: {
      name: 'Telegram',
      icon: '✈️',
      color: '#0088CC',
      gradient: 'linear-gradient(135deg, #0088CC 0%, #006BA6 100%)',
      tagline: 'Cloud messaging with bot platform',
      benefits: ['Instant bot commands', 'Rich media & files', 'Group & channel support'],
      authType: 'token',
      tokenLabel: 'Bot Token',
      tokenPlaceholder: '123456789:ABCdef-GHIjkl...',
      tokenHelp: 'Get this from @BotFather on Telegram',
      tokenGuideUrl: 'https://core.telegram.org/bots#botfather',
      validateFormat: function(v) { return /^\d+:[A-Za-z0-9_-]{30,}$/.test(v); },
      configKey: 'token',
      phase: 1
    },
    discord: {
      name: 'Discord',
      icon: '🎮',
      color: '#5865F2',
      gradient: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
      tagline: 'Community platform for teams & gamers',
      benefits: ['Server integration', 'Slash commands', 'Voice & threads'],
      authType: 'token',
      tokenLabel: 'Bot Token',
      tokenPlaceholder: 'MTI3NTMx...',
      tokenHelp: 'From Discord Developer Portal → Bot → Token',
      tokenGuideUrl: 'https://discord.com/developers/applications',
      validateFormat: function(v) { return v.length >= 50; },
      configKey: 'token',
      phase: 1
    },
    whatsapp: {
      name: 'WhatsApp',
      icon: '💚',
      color: '#25D366',
      gradient: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
      tagline: 'Global messaging, billions of users',
      benefits: ['Worldwide reach', 'Business API', 'Rich media & location'],
      authType: 'qr',
      tokenLabel: 'Access Token',
      tokenPlaceholder: 'EAAx...',
      tokenHelp: 'From Meta Business Suite → WhatsApp',
      tokenGuideUrl: 'https://business.facebook.com/',
      validateFormat: function(v) { return v.length >= 10; },
      configKey: 'token',
      phase: 1
    },
    signal: {
      name: 'Signal',
      icon: '📱',
      color: '#3A76F0',
      gradient: 'linear-gradient(135deg, #3A76F0 0%, #2D5DD7 100%)',
      tagline: 'Private, encrypted messaging',
      benefits: ['End-to-end encryption', 'Disappearing messages', 'No data collection'],
      authType: 'phone',
      tokenLabel: 'Phone Number',
      tokenPlaceholder: '+33 6 12 34 56 78',
      tokenHelp: 'International format with country code',
      validateFormat: function(v) { return /^\+\d{8,15}$/.test(v.replace(/[\s\-()]/g, '')); },
      configKey: 'phoneNumber',
      phase: 1
    },
    imessage: {
      name: 'iMessage',
      icon: '💬',
      color: '#34C759',
      gradient: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
      tagline: 'Native Apple ecosystem messaging',
      benefits: ['macOS integration', 'Rich media', 'Handoff across devices'],
      authType: 'system',
      phase: 1
    },
    slack: {
      name: 'Slack',
      icon: '💼',
      color: '#4A154B',
      gradient: 'linear-gradient(135deg, #4A154B 0%, #611F69 100%)',
      tagline: 'Professional team communication',
      benefits: ['Workspace channels', 'Thread conversations', 'App integrations'],
      authType: 'token',
      tokenLabel: 'Bot Token',
      tokenPlaceholder: 'xoxb-...',
      tokenHelp: 'From Slack API → OAuth & Permissions → Bot Token',
      tokenGuideUrl: 'https://api.slack.com/apps',
      validateFormat: function(v) { return /^xoxb-/.test(v); },
      configKey: 'token',
      phase: 1
    },
    google: {
      name: 'Google Workspace',
      icon: '📧',
      color: '#4285F4',
      gradient: 'linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC05 100%)',
      tagline: 'Gmail, Calendar, Drive — all connected',
      benefits: ['Email integration', 'Calendar sync', 'Drive access'],
      authType: 'oauth',
      phase: 2
    },
    github: {
      name: 'GitHub',
      icon: '🐙',
      color: '#171515',
      gradient: 'linear-gradient(135deg, #24292e 0%, #40464d 100%)',
      tagline: 'Code, issues, and pull requests',
      benefits: ['Issue tracking', 'PR notifications', 'CI/CD integration'],
      authType: 'token',
      tokenLabel: 'Personal Access Token',
      tokenPlaceholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      tokenHelp: 'From GitHub → Settings → Developer Settings → Personal Access Tokens',
      tokenGuideUrl: 'https://github.com/settings/tokens',
      validateFormat: function(v) { return /^(ghp_|github_pat_)[A-Za-z0-9_]{20,}$/.test(v); },
      configKey: 'token',
      phase: 1
    }
  };

  // ── State ──────────────────────────────────────────────────────────────────
  var state = {
    overlay: null,
    channel: null,
    step: 0,
    totalSteps: 0,
    verifying: false,
    config: {}
  };

  // ── CSS ────────────────────────────────────────────────────────────────────
  var STYLE = document.createElement('style');
  STYLE.textContent = '\
/* ── SpawnKit Channel Wizard v2 ── */\n\
\n\
/* Keyframes */\n\
@keyframes sk-cw-fade-in { from { opacity: 0; } to { opacity: 1; } }\n\
@keyframes sk-cw-fade-out { from { opacity: 1; } to { opacity: 0; } }\n\
@keyframes sk-cw-slide-up { from { opacity: 0; transform: translateY(24px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }\n\
@keyframes sk-cw-slide-down { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(24px) scale(0.98); } }\n\
@keyframes sk-cw-slide-left { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: translateX(0); } }\n\
@keyframes sk-cw-slide-out-left { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-60px); } }\n\
@keyframes sk-cw-icon-pop {\n\
  0%   { opacity: 0; transform: scale(0.4) rotate(-12deg); }\n\
  60%  { opacity: 1; transform: scale(1.1) rotate(3deg); }\n\
  80%  { transform: scale(0.95) rotate(-1deg); }\n\
  100% { opacity: 1; transform: scale(1) rotate(0deg); }\n\
}\n\
@keyframes sk-cw-pulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.5); opacity: 0; } }\n\
@keyframes sk-cw-ring { 0% { transform: scale(0.85); opacity: 0.7; } 100% { transform: scale(1.6); opacity: 0; } }\n\
@keyframes sk-cw-check-draw { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }\n\
@keyframes sk-cw-dot-bounce {\n\
  0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }\n\
  40% { transform: scale(1); opacity: 1; }\n\
}\n\
@keyframes sk-cw-progress-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\n\
@keyframes sk-cw-shimmer {\n\
  0% { background-position: -200% 0; }\n\
  100% { background-position: 200% 0; }\n\
}\n\
@keyframes sk-cw-confetti {\n\
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }\n\
  100% { transform: translateY(500px) rotate(720deg); opacity: 0; }\n\
}\n\
@keyframes sk-cw-celebrate { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }\n\
@keyframes sk-cw-stagger-in {\n\
  from { opacity: 0; transform: translateY(16px); }\n\
  to   { opacity: 1; transform: translateY(0); }\n\
}\n\
@keyframes sk-cw-status-pulse {\n\
  0%, 100% { box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.4); }\n\
  50% { box-shadow: 0 0 0 8px rgba(52, 199, 89, 0); }\n\
}\n\
\n\
/* Overlay */\n\
.sk-cw-overlay {\n\
  position: fixed; inset: 0; z-index: 10001;\n\
  background: rgba(0, 0, 0, 0.75);\n\
  backdrop-filter: blur(24px) saturate(1.2);\n\
  -webkit-backdrop-filter: blur(24px) saturate(1.2);\n\
  display: flex; align-items: center; justify-content: center;\n\
  font-family: "SF Pro Display", -apple-system, system-ui, "Inter", sans-serif;\n\
  animation: sk-cw-fade-in 0.3s ease;\n\
  -webkit-font-smoothing: antialiased;\n\
}\n\
.sk-cw-overlay.sk-cw-closing {\n\
  animation: sk-cw-fade-out 0.25s ease forwards;\n\
  pointer-events: none;\n\
}\n\
\n\
/* Card */\n\
.sk-cw-card {\n\
  background: rgba(28, 28, 30, 0.97);\n\
  border: 1px solid rgba(255, 255, 255, 0.07);\n\
  border-radius: 24px;\n\
  width: 480px; max-width: calc(100vw - 32px);\n\
  padding: 40px 36px 32px;\n\
  position: relative; overflow: hidden;\n\
  box-shadow: 0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06);\n\
  animation: sk-cw-slide-up 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);\n\
}\n\
.sk-cw-card.sk-cw-leaving {\n\
  animation: sk-cw-slide-down 0.3s ease forwards;\n\
}\n\
\n\
/* Progress Ring */\n\
.sk-cw-progress {\n\
  position: absolute; top: 20px; right: 24px;\n\
  width: 40px; height: 40px;\n\
}\n\
.sk-cw-progress svg { width: 40px; height: 40px; transform: rotate(-90deg); }\n\
.sk-cw-progress-track { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 3; }\n\
.sk-cw-progress-fill {\n\
  fill: none; stroke: #007AFF; stroke-width: 3;\n\
  stroke-linecap: round;\n\
  transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);\n\
}\n\
.sk-cw-progress-text {\n\
  position: absolute; inset: 0;\n\
  display: flex; align-items: center; justify-content: center;\n\
  font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.5);\n\
  letter-spacing: -0.2px;\n\
}\n\
\n\
/* Channel Icon */\n\
.sk-cw-icon-wrap {\n\
  width: 88px; height: 88px; margin: 0 auto 28px;\n\
  border-radius: 22px; position: relative;\n\
  display: flex; align-items: center; justify-content: center;\n\
  font-size: 44px;\n\
  animation: sk-cw-icon-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);\n\
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);\n\
}\n\
.sk-cw-icon-ring {\n\
  position: absolute; inset: -10px;\n\
  border-radius: 32px; border: 2px solid rgba(255,255,255,0.15);\n\
  animation: sk-cw-ring 2.5s ease-out infinite;\n\
}\n\
\n\
/* Typography */\n\
.sk-cw-title {\n\
  font-size: 28px; font-weight: 700; color: #fff;\n\
  margin: 0 0 6px; letter-spacing: -0.8px;\n\
  text-align: center;\n\
}\n\
.sk-cw-subtitle {\n\
  font-size: 15px; color: rgba(255,255,255,0.45);\n\
  margin: 0 0 28px; line-height: 1.55;\n\
  text-align: center;\n\
}\n\
\n\
/* Benefits */\n\
.sk-cw-benefits { margin: 0 0 32px; }\n\
.sk-cw-benefit {\n\
  display: flex; align-items: center; gap: 12px;\n\
  font-size: 14px; color: rgba(255,255,255,0.6);\n\
  padding: 6px 0;\n\
}\n\
.sk-cw-benefit-check {\n\
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;\n\
  display: flex; align-items: center; justify-content: center;\n\
}\n\
.sk-cw-benefit-check svg { width: 12px; height: 12px; }\n\
\n\
/* Input */\n\
.sk-cw-field { margin: 0 0 20px; }\n\
.sk-cw-label {\n\
  display: block; font-size: 12px; font-weight: 600;\n\
  color: rgba(255,255,255,0.45); margin: 0 0 8px;\n\
  text-transform: uppercase; letter-spacing: 0.8px;\n\
}\n\
.sk-cw-input {\n\
  width: 100%; box-sizing: border-box;\n\
  background: rgba(255,255,255,0.05);\n\
  border: 1.5px solid rgba(255,255,255,0.1);\n\
  color: #fff; border-radius: 14px;\n\
  padding: 15px 18px; font-size: 15px;\n\
  font-family: "SF Mono", "Fira Code", Monaco, monospace;\n\
  outline: none; transition: all 0.25s ease;\n\
  letter-spacing: 0.2px;\n\
}\n\
.sk-cw-input:focus {\n\
  border-color: rgba(0, 122, 255, 0.6);\n\
  background: rgba(0, 122, 255, 0.06);\n\
  box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.12);\n\
}\n\
.sk-cw-input.sk-cw-valid {\n\
  border-color: rgba(52, 199, 89, 0.6);\n\
  background: rgba(52, 199, 89, 0.06);\n\
  box-shadow: 0 0 0 4px rgba(52, 199, 89, 0.1);\n\
}\n\
.sk-cw-input.sk-cw-invalid {\n\
  border-color: rgba(255, 59, 48, 0.6);\n\
  background: rgba(255, 59, 48, 0.04);\n\
}\n\
.sk-cw-input::placeholder { color: rgba(255,255,255,0.2); }\n\
.sk-cw-help {\n\
  font-size: 12px; color: rgba(255,255,255,0.35);\n\
  margin: 10px 0 0; line-height: 1.5;\n\
}\n\
.sk-cw-help a {\n\
  color: #007AFF; text-decoration: none;\n\
}\n\
.sk-cw-help a:hover { text-decoration: underline; }\n\
\n\
/* Error */\n\
.sk-cw-error {\n\
  background: rgba(255, 59, 48, 0.1);\n\
  border: 1px solid rgba(255, 59, 48, 0.25);\n\
  border-radius: 12px; padding: 12px 16px;\n\
  margin: 16px 0 0; font-size: 13px;\n\
  color: rgba(255, 100, 90, 0.9); line-height: 1.5;\n\
}\n\
\n\
/* System access (iMessage) */\n\
.sk-cw-system-card {\n\
  background: rgba(255, 149, 0, 0.08);\n\
  border: 1px solid rgba(255, 149, 0, 0.2);\n\
  border-radius: 16px; padding: 24px;\n\
  text-align: center; margin: 20px 0;\n\
}\n\
.sk-cw-system-icon { font-size: 32px; margin: 0 0 12px; display: block; }\n\
.sk-cw-system-text { font-size: 14px; color: rgba(255,255,255,0.6); margin: 0; line-height: 1.5; }\n\
\n\
/* QR Code */\n\
.sk-cw-qr {\n\
  width: 180px; height: 180px; margin: 20px auto;\n\
  background: #fff; border-radius: 16px;\n\
  display: flex; align-items: center; justify-content: center;\n\
  position: relative; overflow: hidden;\n\
}\n\
.sk-cw-qr::after {\n\
  content: "";\n\
  position: absolute; inset: 0;\n\
  background: linear-gradient(180deg, transparent 40%, rgba(0,122,255,0.15) 50%, transparent 60%);\n\
  background-size: 100% 200%;\n\
  animation: sk-cw-shimmer 2s linear infinite;\n\
}\n\
.sk-cw-qr-text { font-size: 12px; color: #666; text-align: center; z-index: 1; }\n\
\n\
/* Skeleton loading */\n\
.sk-cw-skeleton {\n\
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);\n\
  background-size: 200% 100%;\n\
  animation: sk-cw-shimmer 1.5s ease-in-out infinite;\n\
  border-radius: 8px; height: 20px; margin: 8px 0;\n\
}\n\
\n\
/* Verification status */\n\
.sk-cw-verify-status {\n\
  text-align: center; padding: 32px 0 16px;\n\
}\n\
.sk-cw-verify-spinner {\n\
  width: 48px; height: 48px; margin: 0 auto 20px;\n\
  border: 3px solid rgba(255,255,255,0.1);\n\
  border-top-color: #007AFF;\n\
  border-radius: 50%;\n\
  animation: sk-cw-progress-spin 0.8s linear infinite;\n\
}\n\
.sk-cw-verify-dots {\n\
  display: flex; gap: 6px; justify-content: center; margin: 16px 0;\n\
}\n\
.sk-cw-verify-dots span {\n\
  width: 8px; height: 8px; border-radius: 50%;\n\
  background: rgba(255,255,255,0.5);\n\
  animation: sk-cw-dot-bounce 1.4s infinite ease-in-out;\n\
}\n\
.sk-cw-verify-dots span:nth-child(2) { animation-delay: 0.16s; }\n\
.sk-cw-verify-dots span:nth-child(3) { animation-delay: 0.32s; }\n\
.sk-cw-verify-text {\n\
  font-size: 15px; color: rgba(255,255,255,0.6); margin: 0;\n\
  transition: all 0.3s ease;\n\
}\n\
\n\
/* Success */\n\
.sk-cw-success { text-align: center; padding: 24px 0 16px; }\n\
.sk-cw-success-icon {\n\
  width: 72px; height: 72px; margin: 0 auto 20px;\n\
  border-radius: 50%; display: flex;\n\
  align-items: center; justify-content: center;\n\
  background: rgba(52, 199, 89, 0.15);\n\
  animation: sk-cw-celebrate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);\n\
}\n\
.sk-cw-success-icon svg {\n\
  width: 32px; height: 32px; stroke: #34C759; fill: none;\n\
  stroke-width: 3; stroke-linecap: round; stroke-linejoin: round;\n\
  stroke-dasharray: 24; stroke-dashoffset: 24;\n\
  animation: sk-cw-check-draw 0.5s 0.3s ease forwards;\n\
}\n\
.sk-cw-success-details {\n\
  background: rgba(255,255,255,0.04);\n\
  border-radius: 12px; padding: 12px 16px;\n\
  margin: 16px 0; font-size: 13px;\n\
  color: rgba(255,255,255,0.5); text-align: left;\n\
}\n\
.sk-cw-success-detail { padding: 4px 0; display: flex; justify-content: space-between; }\n\
.sk-cw-success-detail strong { color: rgba(255,255,255,0.8); font-weight: 500; }\n\
\n\
/* Buttons */\n\
.sk-cw-actions {\n\
  display: flex; align-items: center; justify-content: space-between;\n\
  margin: 32px 0 0; gap: 12px;\n\
}\n\
.sk-cw-btn {\n\
  border: none; border-radius: 14px;\n\
  padding: 14px 28px; font-size: 15px; font-weight: 600;\n\
  font-family: inherit; cursor: pointer;\n\
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);\n\
  position: relative; overflow: hidden;\n\
  -webkit-tap-highlight-color: transparent;\n\
}\n\
.sk-cw-btn:active:not(:disabled) { transform: scale(0.97); }\n\
.sk-cw-btn:disabled { opacity: 0.35; cursor: not-allowed; }\n\
.sk-cw-btn-primary {\n\
  color: #fff;\n\
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);\n\
}\n\
.sk-cw-btn-primary:hover:not(:disabled) {\n\
  transform: translateY(-1px);\n\
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);\n\
}\n\
.sk-cw-btn-secondary {\n\
  background: rgba(255,255,255,0.07);\n\
  color: rgba(255,255,255,0.7);\n\
  border: 1px solid rgba(255,255,255,0.1);\n\
}\n\
.sk-cw-btn-secondary:hover:not(:disabled) {\n\
  background: rgba(255,255,255,0.1);\n\
  color: rgba(255,255,255,0.9);\n\
}\n\
.sk-cw-btn-ghost {\n\
  background: transparent; color: rgba(255,255,255,0.35);\n\
  font-size: 13px; padding: 8px 0;\n\
}\n\
.sk-cw-btn-ghost:hover { color: rgba(255,255,255,0.6); }\n\
\n\
/* Coming soon badge */\n\
.sk-cw-coming-soon {\n\
  position: absolute; top: 10px; right: 10px;\n\
  background: rgba(255, 149, 0, 0.2); color: rgba(255, 149, 0, 0.9);\n\
  font-size: 10px; font-weight: 700; padding: 3px 8px;\n\
  border-radius: 6px; text-transform: uppercase;\n\
  letter-spacing: 0.5px;\n\
}\n\
\n\
/* Already connected */\n\
.sk-cw-already {\n\
  text-align: center; padding: 24px 0;\n\
}\n\
.sk-cw-already-badge {\n\
  display: inline-flex; align-items: center; gap: 8px;\n\
  background: rgba(52, 199, 89, 0.12);\n\
  border: 1px solid rgba(52, 199, 89, 0.3);\n\
  border-radius: 100px; padding: 10px 20px;\n\
  font-size: 14px; font-weight: 600; color: #34C759;\n\
  animation: sk-cw-status-pulse 2s infinite;\n\
}\n\
\n\
/* Confetti */\n\
.sk-cw-confetti {\n\
  position: fixed; pointer-events: none; z-index: 10002;\n\
  width: 8px; height: 8px; border-radius: 2px;\n\
}\n\
\n\
/* Settings integration */\n\
.sk-cw-settings-grid {\n\
  display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));\n\
  gap: 10px; margin: 12px 0;\n\
}\n\
.sk-cw-settings-card {\n\
  background: rgba(255,255,255,0.04);\n\
  border: 1px solid rgba(255,255,255,0.07);\n\
  border-radius: 14px; padding: 16px 10px;\n\
  text-align: center; cursor: pointer;\n\
  transition: all 0.25s ease;\n\
  position: relative;\n\
}\n\
.sk-cw-settings-card:hover {\n\
  background: rgba(255,255,255,0.07);\n\
  border-color: rgba(255,255,255,0.12);\n\
  transform: translateY(-2px);\n\
}\n\
.sk-cw-settings-card.sk-cw-connected {\n\
  border-color: rgba(52, 199, 89, 0.35);\n\
  background: rgba(52, 199, 89, 0.06);\n\
}\n\
.sk-cw-settings-card-icon { font-size: 24px; display: block; margin: 0 0 8px; }\n\
.sk-cw-settings-card-name {\n\
  font-size: 12px; font-weight: 600; color: #fff; margin: 0 0 3px;\n\
}\n\
.sk-cw-settings-card-status {\n\
  font-size: 10px; color: rgba(255,255,255,0.35);\n\
}\n\
.sk-cw-settings-card.sk-cw-connected .sk-cw-settings-card-status {\n\
  color: rgba(52, 199, 89, 0.8);\n\
}\n\
\n\
/* Responsive */\n\
@media (max-width: 520px) {\n\
  .sk-cw-card { padding: 28px 20px 24px; border-radius: 20px; }\n\
  .sk-cw-title { font-size: 24px; }\n\
  .sk-cw-icon-wrap { width: 72px; height: 72px; font-size: 36px; border-radius: 18px; }\n\
  .sk-cw-actions { flex-direction: column-reverse; }\n\
  .sk-cw-btn { width: 100%; text-align: center; }\n\
}\n\
';
  document.head.appendChild(STYLE);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function(k) {
      if (k === 'className') e.className = attrs[k];
      else if (k === 'innerHTML') e.innerHTML = attrs[k];
      else if (k === 'textContent') e.textContent = attrs[k];
      else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(e.style, attrs[k]);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    if (children) children.forEach(function(c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  function progressRingSVG(step, total) {
    var r = 16, circ = 2 * Math.PI * r;
    var pct = total > 0 ? step / total : 0;
    var offset = circ * (1 - pct);
    return '<svg viewBox="0 0 40 40"><circle class="sk-cw-progress-track" cx="20" cy="20" r="' + r + '"/>' +
      '<circle class="sk-cw-progress-fill" cx="20" cy="20" r="' + r + '" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '"/></svg>' +
      '<span class="sk-cw-progress-text">' + step + '/' + total + '</span>';
  }

  function checkSVG(color) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="' + (color || '#34C759') + '" stroke-width="2.5" stroke-linecap="round"><polyline points="4 12 10 18 20 6"></polyline></svg>';
  }

  function benefitsList(benefits, color) {
    return benefits.map(function(b, i) {
      return '<div class="sk-cw-benefit" style="animation: sk-cw-stagger-in 0.4s ' + (0.1 + i * 0.08) + 's ease both;">' +
        '<span class="sk-cw-benefit-check" style="background: ' + color + '20;">' + checkSVG(color) + '</span>' +
        '<span>' + b + '</span></div>';
    }).join('');
  }

  function getConnected() {
    try { return JSON.parse(localStorage.getItem('spawnkit-channels') || '{}'); }
    catch(e) { return {}; }
  }

  function saveConnected(id, data) {
    var all = getConnected();
    all[id] = data;
    localStorage.setItem('spawnkit-channels', JSON.stringify(all));
  }

  function isConnected(id) {
    return !!getConnected()[id];
  }

  async function apiPost(url, body) {
    try {
      var token = localStorage.getItem('spawnkit-token') || localStorage.getItem('spawnkit-config');
      var headers = { 'Content-Type': 'application/json' };
      if (token) {
        try { var parsed = JSON.parse(token); if (parsed.relayToken) token = parsed.relayToken; } catch(e) {}
        headers['Authorization'] = 'Bearer ' + token;
      }
      var resp = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
      return await resp.json();
    } catch(e) {
      return { ok: false, error: e.message };
    }
  }

  async function apiGet(url) {
    try {
      var token = localStorage.getItem('spawnkit-token');
      var headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      var resp = await fetch(url, { headers: headers });
      return await resp.json();
    } catch(e) {
      return { ok: false, error: e.message };
    }
  }

  // ── Confetti ───────────────────────────────────────────────────────────────
  var confettiPieces = [];

  function launchConfetti(color) {
    var colors = [color || '#007AFF', '#34C759', '#FF9500', '#FF2D55', '#5856D6', '#00C7BE'];
    for (var i = 0; i < 40; i++) {
      (function(idx) {
        setTimeout(function() {
          var p = document.createElement('div');
          p.className = 'sk-cw-confetti';
          p.style.cssText = 'left:' + (Math.random() * 100) + 'vw;top:' + (Math.random() * 20 - 10) + 'vh;' +
            'background:' + colors[idx % colors.length] + ';' +
            'animation:sk-cw-confetti ' + (2 + Math.random()) + 's ease-in forwards;' +
            'animation-delay:' + (Math.random() * 0.4) + 's;' +
            'width:' + (6 + Math.random() * 6) + 'px;height:' + (4 + Math.random() * 4) + 'px;' +
            'border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';';
          document.body.appendChild(p);
          confettiPieces.push(p);
          p.addEventListener('animationend', function() { if (p.parentNode) p.remove(); });
        }, idx * 20);
      })(i);
    }
  }

  function clearConfetti() {
    confettiPieces.forEach(function(p) { if (p.parentNode) p.remove(); });
    confettiPieces = [];
  }

  // ── Step Renderers ─────────────────────────────────────────────────────────

  function renderIntro(ch) {
    return '<div style="text-align:center;">' +
      '<div class="sk-cw-icon-wrap" style="background:' + ch.gradient + ';">' +
        ch.icon + '<div class="sk-cw-icon-ring"></div></div>' +
      '<h1 class="sk-cw-title">Connect ' + ch.name + '</h1>' +
      '<p class="sk-cw-subtitle">' + ch.tagline + '</p>' +
      '</div>' +
      '<div class="sk-cw-benefits">' + benefitsList(ch.benefits, ch.color) + '</div>';
  }

  function renderDetecting(ch) {
    return '<div class="sk-cw-verify-status">' +
      '<div class="sk-cw-verify-spinner" style="border-top-color:' + ch.color + ';"></div>' +
      '<p class="sk-cw-verify-text">Checking existing connections...</p>' +
      '<div class="sk-cw-skeleton" style="width:70%;margin:16px auto 0;"></div>' +
      '<div class="sk-cw-skeleton" style="width:50%;margin:8px auto 0;"></div>' +
      '</div>';
  }

  function renderAlreadyConnected(ch, details) {
    var detailsHTML = '';
    if (details && typeof details === 'object') {
      var entries = Object.entries(details).filter(function(e) { return typeof e[1] === 'string' || typeof e[1] === 'number'; }).slice(0, 3);
      if (entries.length > 0) {
        detailsHTML = '<div class="sk-cw-success-details">' +
          entries.map(function(e) { return '<div class="sk-cw-success-detail"><span>' + e[0] + '</span><strong>' + e[1] + '</strong></div>'; }).join('') +
          '</div>';
      }
    }
    return '<div class="sk-cw-already">' +
      '<div class="sk-cw-icon-wrap" style="background:' + ch.gradient + ';">' + ch.icon + '</div>' +
      '<h1 class="sk-cw-title">' + ch.name + '</h1>' +
      '<div class="sk-cw-already-badge">✓ Already Connected</div>' +
      detailsHTML +
      '</div>';
  }

  function renderTokenInput(ch) {
    return '<div style="text-align:center;margin:0 0 24px;">' +
      '<div class="sk-cw-icon-wrap" style="background:' + ch.gradient + ';width:56px;height:56px;font-size:28px;border-radius:16px;margin-bottom:20px;">' + ch.icon + '</div>' +
      '<h2 class="sk-cw-title" style="font-size:22px;">Enter your ' + ch.tokenLabel + '</h2>' +
      '</div>' +
      '<div class="sk-cw-field">' +
        '<label class="sk-cw-label">' + ch.tokenLabel + '</label>' +
        '<input class="sk-cw-input" id="skCwTokenInput" type="text" placeholder="' + ch.tokenPlaceholder + '" autocomplete="off" spellcheck="false" />' +
        '<p class="sk-cw-help">' + ch.tokenHelp +
          (ch.tokenGuideUrl ? ' — <a href="' + ch.tokenGuideUrl + '" target="_blank" rel="noopener">Open guide ↗</a>' : '') +
        '</p>' +
      '</div>' +
      '<div id="skCwTokenError"></div>';
  }

  function renderQRInput(ch) {
    return '<div style="text-align:center;margin:0 0 16px;">' +
      '<h2 class="sk-cw-title" style="font-size:22px;">Link your device</h2>' +
      '<p class="sk-cw-subtitle" style="margin-bottom:20px;">Scan this QR code with ' + ch.name + ' on your phone</p>' +
      '</div>' +
      '<div class="sk-cw-qr"><span class="sk-cw-qr-text">📱 QR Code<br>Scan to link</span></div>' +
      '<p style="text-align:center;font-size:12px;color:rgba(255,255,255,0.3);margin:16px 0 0;">Or enter credentials manually below</p>' +
      '<div class="sk-cw-field" style="margin-top:16px;">' +
        '<label class="sk-cw-label">' + (ch.tokenLabel || 'Access Token') + '</label>' +
        '<input class="sk-cw-input" id="skCwTokenInput" type="text" placeholder="' + (ch.tokenPlaceholder || 'Paste token...') + '" autocomplete="off" />' +
      '</div>';
  }

  function renderSystemAuth(ch) {
    return '<div style="text-align:center;">' +
      '<div class="sk-cw-icon-wrap" style="background:' + ch.gradient + ';">' + ch.icon + '</div>' +
      '<h1 class="sk-cw-title" style="font-size:22px;">' + ch.name + ' on macOS</h1>' +
      '</div>' +
      '<div class="sk-cw-system-card">' +
        '<span class="sk-cw-system-icon">🔐</span>' +
        '<p class="sk-cw-system-text">SpawnKit will use system integration to connect to Messages.app.<br>No tokens or passwords needed.</p>' +
      '</div>';
  }

  function renderPhoneInput(ch) {
    return '<div style="text-align:center;margin:0 0 24px;">' +
      '<div class="sk-cw-icon-wrap" style="background:' + ch.gradient + ';width:56px;height:56px;font-size:28px;border-radius:16px;margin-bottom:20px;">' + ch.icon + '</div>' +
      '<h2 class="sk-cw-title" style="font-size:22px;">Link your ' + ch.name + '</h2>' +
      '</div>' +
      '<div class="sk-cw-field">' +
        '<label class="sk-cw-label">' + ch.tokenLabel + '</label>' +
        '<input class="sk-cw-input" id="skCwTokenInput" type="tel" placeholder="' + ch.tokenPlaceholder + '" autocomplete="off" />' +
        '<p class="sk-cw-help">' + ch.tokenHelp + '</p>' +
      '</div>';
  }

  function renderVerifying(ch) {
    return '<div class="sk-cw-verify-status">' +
      '<div class="sk-cw-verify-spinner" style="border-top-color:' + ch.color + ';"></div>' +
      '<p class="sk-cw-verify-text" id="skCwVerifyText">Connecting to ' + ch.name + '...</p>' +
      '<div class="sk-cw-verify-dots"><span></span><span></span><span></span></div>' +
      '</div>';
  }

  function renderSuccess(ch, details) {
    var detailsHTML = '';
    if (details && typeof details === 'object') {
      var entries = Object.entries(details).filter(function(e) {
        return (typeof e[1] === 'string' || typeof e[1] === 'number') && e[0] !== 'mode';
      }).slice(0, 4);
      if (entries.length > 0) {
        detailsHTML = '<div class="sk-cw-success-details">' +
          entries.map(function(e) {
            var label = e[0].replace(/([A-Z])/g, ' $1').replace(/^./, function(s) { return s.toUpperCase(); });
            return '<div class="sk-cw-success-detail"><span>' + label + '</span><strong>' + e[1] + '</strong></div>';
          }).join('') + '</div>';
      }
    }
    return '<div class="sk-cw-success">' +
      '<div class="sk-cw-success-icon">' +
        '<svg viewBox="0 0 24 24"><polyline points="4 12 10 18 20 6"></polyline></svg>' +
      '</div>' +
      '<h1 class="sk-cw-title">' + ch.name + ' Connected!</h1>' +
      '<p class="sk-cw-subtitle">You\'re all set. Messages will flow through ' + ch.name + '.</p>' +
      detailsHTML +
      '</div>';
  }

  function renderComingSoon(ch) {
    return '<div style="text-align:center;">' +
      '<div class="sk-cw-icon-wrap" style="background:' + ch.gradient + ';opacity:0.7;">' + ch.icon + '</div>' +
      '<h1 class="sk-cw-title">' + ch.name + '</h1>' +
      '<p class="sk-cw-subtitle">' + ch.tagline + '</p>' +
      '<div style="background:rgba(255,149,0,0.1);border:1px solid rgba(255,149,0,0.25);border-radius:12px;padding:16px;margin:24px 0;">' +
        '<span style="font-size:24px;display:block;margin-bottom:8px;">🚧</span>' +
        '<p style="font-size:14px;color:rgba(255,255,255,0.6);margin:0;">Coming soon! We\'re working on ' + ch.name + ' integration.</p>' +
      '</div>' +
      '</div>';
  }

  // ── Wizard Flow Controller ─────────────────────────────────────────────────

  // Steps: 0=intro, 1=detect, 2=auth, 3=verify, 4=success
  var STEP_NAMES = ['intro', 'detect', 'auth', 'verify', 'success'];

  function open(channelId) {
    var ch = CHANNELS[channelId];
    if (!ch) { console.error('[ChannelWizard] Unknown channel:', channelId); return; }

    // Close any existing
    closeImmediate();

    state.channel = channelId;
    state.step = 0;
    state.totalSteps = ch.phase === 2 ? 1 : 4; // coming soon = 1 step
    state.verifying = false;
    state.config = {};

    // Create overlay
    state.overlay = el('div', { className: 'sk-cw-overlay' });
    state.overlay.addEventListener('click', function(e) {
      if (e.target === state.overlay) close();
    });

    document.body.appendChild(state.overlay);
    renderStep();
  }

  function renderStep() {
    var ch = CHANNELS[state.channel];
    if (!ch || !state.overlay) return;

    // Remove old card with animation
    var oldCard = state.overlay.querySelector('.sk-cw-card');
    if (oldCard) {
      oldCard.classList.add('sk-cw-leaving');
      setTimeout(function() { if (oldCard.parentNode) oldCard.remove(); }, 300);
      setTimeout(renderCard, 150);
    } else {
      renderCard();
    }

    function renderCard() {
      var card = el('div', { className: 'sk-cw-card' });

      // Coming soon
      if (ch.phase === 2) {
        card.innerHTML = renderComingSoon(ch) +
          '<div class="sk-cw-actions"><div></div>' +
          '<button class="sk-cw-btn sk-cw-btn-secondary" id="skCwClose">Close</button></div>';
        state.overlay.appendChild(card);
        bindEvents(card);
        return;
      }

      // Progress ring (not on intro or success)
      if (state.step > 0 && state.step < 4) {
        var progress = el('div', { className: 'sk-cw-progress', innerHTML: progressRingSVG(state.step, 3) });
        card.appendChild(progress);
      }

      // Content
      var content = el('div');
      var stepName = STEP_NAMES[state.step];

      switch (stepName) {
        case 'intro':
          content.innerHTML = renderIntro(ch);
          break;
        case 'detect':
          content.innerHTML = renderDetecting(ch);
          break;
        case 'auth':
          if (ch.authType === 'token') content.innerHTML = renderTokenInput(ch);
          else if (ch.authType === 'qr') content.innerHTML = renderQRInput(ch);
          else if (ch.authType === 'system') content.innerHTML = renderSystemAuth(ch);
          else if (ch.authType === 'phone') content.innerHTML = renderPhoneInput(ch);
          else content.innerHTML = renderTokenInput(ch);
          break;
        case 'verify':
          content.innerHTML = renderVerifying(ch);
          break;
        case 'success':
          content.innerHTML = renderSuccess(ch, state.verifyResult);
          break;
      }

      card.appendChild(content);

      // Actions
      var actions = el('div', { className: 'sk-cw-actions' });

      switch (stepName) {
        case 'intro':
          actions.innerHTML = '<button class="sk-cw-btn sk-cw-btn-ghost" id="skCwClose">Cancel</button>' +
            '<button class="sk-cw-btn sk-cw-btn-primary" id="skCwNext" style="background:' + ch.gradient + ';">Get Started →</button>';
          break;
        case 'detect':
          // No buttons during detection
          break;
        case 'auth':
          var needsInput = ch.authType !== 'system';
          actions.innerHTML = '<button class="sk-cw-btn sk-cw-btn-secondary" id="skCwBack">← Back</button>' +
            '<button class="sk-cw-btn sk-cw-btn-primary" id="skCwVerify" style="background:' + ch.gradient + ';"' +
            (needsInput ? ' disabled' : '') + '>' +
            (ch.authType === 'system' ? 'Detect Integration →' : 'Verify & Connect →') + '</button>';
          break;
        case 'verify':
          // No buttons during verification
          break;
        case 'success':
          actions.innerHTML = '<div></div>' +
            '<button class="sk-cw-btn sk-cw-btn-primary" id="skCwDone" style="background:' + ch.gradient + ';">Start Messaging →</button>';
          break;
      }

      card.appendChild(actions);
      state.overlay.appendChild(card);
      bindEvents(card);

      // Auto-advance for detect step
      if (stepName === 'detect') {
        runDetection(ch);
      }

      // Auto-run for verify step
      if (stepName === 'verify') {
        runVerification(ch);
      }

      // Focus input
      if (stepName === 'auth') {
        setTimeout(function() {
          var input = document.getElementById('skCwTokenInput');
          if (input) input.focus();
        }, 400);
      }
    }
  }

  function bindEvents(card) {
    card.addEventListener('click', function(e) {
      var id = e.target.id;
      if (id === 'skCwClose') close();
      else if (id === 'skCwNext') { state.step = 1; renderStep(); }
      else if (id === 'skCwBack') { state.step = state.step > 0 ? state.step - 1 : 0; renderStep(); }
      else if (id === 'skCwVerify') handleVerifyClick();
      else if (id === 'skCwDone') handleDone();
      else if (id === 'skCwReconnect') { state.step = 2; renderStep(); }
    });

    // Live input validation
    card.addEventListener('input', function(e) {
      if (e.target.id === 'skCwTokenInput') {
        var ch = CHANNELS[state.channel];
        var val = e.target.value.trim();
        var btn = document.getElementById('skCwVerify');

        if (ch.validateFormat) {
          var valid = ch.validateFormat(val);
          e.target.classList.toggle('sk-cw-valid', valid && val.length > 0);
          e.target.classList.toggle('sk-cw-invalid', !valid && val.length > 5);
          if (btn) btn.disabled = !valid;
        } else {
          if (btn) btn.disabled = val.length === 0;
        }
      }
    });

    // Enter to submit
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && e.target.id === 'skCwTokenInput') {
        var btn = document.getElementById('skCwVerify');
        if (btn && !btn.disabled) btn.click();
      }
    });
  }

  // ── Detection: check if channel is already configured ──────────────────────
  async function runDetection(ch) {
    // Check localStorage first (fast)
    if (isConnected(state.channel)) {
      var saved = getConnected()[state.channel];
      setTimeout(function() {
        state.verifyResult = saved.details || {};
        showAlreadyConnected(ch, saved.details);
      }, 800);
      return;
    }

    // Check server-side channels status
    try {
      var result = await apiGet('/api/oc/channels/status');
      if (result.channels) {
        var found = result.channels.find(function(c) { return c.id === state.channel && c.connected; });
        if (found) {
          // Also save to localStorage so future checks are instant
          saveConnected(state.channel, {
            name: ch.name, icon: ch.icon,
            details: found.details || found,
            source: found.source || 'server',
            connectedAt: found.connectedAt || Date.now()
          });
          state.verifyResult = found.details || found;
          showAlreadyConnected(ch, found.details || found);
          return;
        }
      }
    } catch(e) { /* continue to auth */ }

    // Also check OpenClaw config directly (channel might be configured in openclaw.json)
    try {
      var config = await apiGet('/api/oc/config');
      if (config && config.channels && config.channels[state.channel]) {
        var chConf = config.channels[state.channel];
        if (chConf && chConf.enabled !== false) {
          saveConnected(state.channel, {
            name: ch.name, icon: ch.icon,
            details: { source: 'openclaw', configured: true },
            connectedAt: Date.now()
          });
          state.verifyResult = { source: 'OpenClaw Config', status: 'Active' };
          showAlreadyConnected(ch, { source: 'OpenClaw Config', status: 'Active' });
          return;
        }
      }
    } catch(e) { /* continue to auth */ }

    // Not connected — go to auth step
    setTimeout(function() {
      state.step = 2;
      renderStep();
    }, 1200);
  }

  function showAlreadyConnected(ch, details) {
    var card = state.overlay.querySelector('.sk-cw-card');
    if (!card) return;

    // Replace entire card content (clear spinner, detect content, everything)
    card.innerHTML = renderAlreadyConnected(ch, details) +
      '<div class="sk-cw-actions">' +
        '<button class="sk-cw-btn sk-cw-btn-secondary" id="skCwReconnect">Reconnect</button>' +
        '<button class="sk-cw-btn sk-cw-btn-primary" id="skCwDone" style="background:' + ch.gradient + ';">Done</button>' +
      '</div>';

    // Re-bind click handlers since we replaced innerHTML
    bindEvents(card);
  }

  // ── Verification: real API call ────────────────────────────────────────────
  function handleVerifyClick() {
    var ch = CHANNELS[state.channel];
    var input = document.getElementById('skCwTokenInput');
    var val = input ? input.value.trim() : '';

    if (ch.authType === 'system') {
      // iMessage — no token needed
      state.config = {};
    } else if (ch.authType === 'phone') {
      state.config = { phoneNumber: val };
    } else {
      state.config = {};
      state.config[ch.configKey || 'token'] = val;
    }

    state.step = 3;
    renderStep();
  }

  async function runVerification(ch) {
    var statusEl = document.getElementById('skCwVerifyText');

    function updateStatus(text) {
      if (statusEl) {
        statusEl.style.opacity = '0';
        setTimeout(function() {
          statusEl.textContent = text;
          statusEl.style.opacity = '1';
        }, 200);
      }
    }

    // Step through status messages for feel
    await new Promise(function(r) { setTimeout(r, 600); });
    updateStatus('Verifying credentials...');
    await new Promise(function(r) { setTimeout(r, 400); });

    // Real API call
    var result = await apiPost('/api/oc/channels/verify', {
      channel: state.channel,
      config: state.config
    });

    if (result.ok) {
      updateStatus('Connection successful!');
      await new Promise(function(r) { setTimeout(r, 600); });

      // Save to server
      await apiPost('/api/oc/channels/save', {
        channel: state.channel,
        name: ch.name,
        config: state.config,
        details: result.details || {}
      });

      // Save to localStorage
      saveConnected(state.channel, {
        name: ch.name,
        icon: ch.icon,
        details: result.details || {},
        connectedAt: Date.now()
      });

      state.verifyResult = result.details;
      state.step = 4;
      renderStep();
      launchConfetti(ch.color);
    } else {
      // Show error on auth step
      state.step = 2;
      renderStep();
      setTimeout(function() {
        var errContainer = document.getElementById('skCwTokenError');
        if (errContainer) {
          var errDiv = document.createElement('div');
          errDiv.className = 'sk-cw-error';
          errDiv.textContent = '❌ ' + (result.error || 'Verification failed. Please check your credentials.');
          errContainer.innerHTML = '';
          errContainer.appendChild(errDiv);
        }
        // Re-populate input
        var input = document.getElementById('skCwTokenInput');
        if (input) {
          var key = CHANNELS[state.channel].configKey || 'token';
          input.value = state.config[key] || state.config.phoneNumber || '';
          input.classList.add('sk-cw-invalid');
          input.focus();
          var btn = document.getElementById('skCwVerify');
          if (btn) btn.disabled = false;
        }
      }, 200);
    }
  }

  function handleDone() {
    close();
    // Try to open chat panel targeting this channel
    if (window.openChatPanel) {
      setTimeout(function() { window.openChatPanel(); }, 400);
    }
  }

  // ── Close ──────────────────────────────────────────────────────────────────
  function close() {
    clearConfetti();
    if (state.overlay) {
      state.overlay.classList.add('sk-cw-closing');
      setTimeout(function() {
        closeImmediate();
        updateSettingsSection();
        updateTargetDropdown();
      }, 280);
    }
  }

  function closeImmediate() {
    if (state.overlay && state.overlay.parentNode) {
      state.overlay.remove();
    }
    state.overlay = null;
    state.channel = null;
    state.step = 0;
    state.config = {};
  }

  // ── Settings Panel Integration ─────────────────────────────────────────────
  function addSettingsSection() {
    var body = document.getElementById('settingsBody');
    if (!body) return;

    // Remove existing
    var existing = body.querySelector('.sk-cw-settings-section');
    if (existing) existing.remove();

    var connected = getConnected();
    var section = el('div', { className: 'sk-cw-settings-section' });
    section.innerHTML = '<h3 style="font-size:14px;font-weight:600;color:#fff;margin:24px 0 12px;display:flex;align-items:center;gap:8px;">' +
      '<span>📡</span> Channel Connections</h3>' +
      '<div class="sk-cw-settings-grid">' +
      Object.keys(CHANNELS).map(function(id) {
        var ch = CHANNELS[id];
        var conn = connected[id];
        var isConn = !!conn;
        return '<div class="sk-cw-settings-card' + (isConn ? ' sk-cw-connected' : '') + '" data-channel="' + id + '">' +
          (ch.phase === 2 ? '<div class="sk-cw-coming-soon">Soon</div>' : '') +
          '<span class="sk-cw-settings-card-icon">' + ch.icon + '</span>' +
          '<div class="sk-cw-settings-card-name">' + ch.name + '</div>' +
          '<div class="sk-cw-settings-card-status">' + (isConn ? '✓ Connected' : 'Connect') + '</div>' +
          '</div>';
      }).join('') +
      '</div>';

    section.querySelectorAll('.sk-cw-settings-card').forEach(function(card) {
      card.addEventListener('click', function() {
        var id = card.dataset.channel;
        // Close settings
        var closeBtn = document.getElementById('settingsClose');
        if (closeBtn) closeBtn.click();
        setTimeout(function() { open(id); }, 350);
      });
    });

    body.appendChild(section);
  }

  function updateSettingsSection() {
    // Refresh if settings panel is open
    var body = document.getElementById('settingsBody');
    if (body && body.querySelector('.sk-cw-settings-section')) {
      addSettingsSection();
    }
  }

  // ── Chat Target Dropdown Integration ───────────────────────────────────────
  function updateTargetDropdown() {
    var select = document.getElementById('chatTargetSelect');
    if (!select) return;
    var connected = getConnected();
    var existing = Array.from(select.options).map(function(o) { return o.value; });
    Object.keys(connected).forEach(function(id) {
      if (!existing.includes(id)) {
        var ch = CHANNELS[id];
        if (ch) {
          var opt = document.createElement('option');
          opt.value = id;
          opt.textContent = ch.icon + ' ' + ch.name;
          select.appendChild(opt);
        }
      }
    });
  }

  // ── Quick Connect (for onboarding Beat 2.5) ────────────────────────────────
  function openQuickConnect() {
    // Opens a simplified channel picker overlay
    closeImmediate();
    var connected = getConnected();

    var overlay = el('div', { className: 'sk-cw-overlay' });
    var card = el('div', { className: 'sk-cw-card', style: { maxWidth: '520px' } });

    card.innerHTML = '<div style="text-align:center;margin-bottom:28px;">' +
      '<h1 class="sk-cw-title" style="font-size:24px;">Connect Your Channels</h1>' +
      '<p class="sk-cw-subtitle" style="margin-bottom:0;">Choose how you want to communicate with your agents</p>' +
      '</div>' +
      '<div class="sk-cw-settings-grid" style="grid-template-columns:repeat(3,1fr);">' +
      Object.keys(CHANNELS).filter(function(id) { return CHANNELS[id].phase === 1; }).map(function(id, i) {
        var ch = CHANNELS[id];
        var conn = connected[id];
        return '<div class="sk-cw-settings-card' + (conn ? ' sk-cw-connected' : '') + '" data-channel="' + id + '" ' +
          'style="animation:sk-cw-stagger-in 0.4s ' + (i * 0.06) + 's ease both;">' +
          '<span class="sk-cw-settings-card-icon">' + ch.icon + '</span>' +
          '<div class="sk-cw-settings-card-name">' + ch.name + '</div>' +
          '<div class="sk-cw-settings-card-status">' + (conn ? '✓ Connected' : 'Connect') + '</div></div>';
      }).join('') +
      '</div>' +
      '<div class="sk-cw-actions" style="margin-top:24px;">' +
        '<button class="sk-cw-btn sk-cw-btn-ghost" id="skCwSkipChannels">Skip for now</button>' +
        '<button class="sk-cw-btn sk-cw-btn-secondary" id="skCwCloseChannels">Continue →</button>' +
      '</div>';

    card.querySelectorAll('.sk-cw-settings-card').forEach(function(c) {
      c.addEventListener('click', function() {
        var id = c.dataset.channel;
        overlay.remove();
        open(id);
      });
    });

    card.addEventListener('click', function(e) {
      if (e.target.id === 'skCwSkipChannels' || e.target.id === 'skCwCloseChannels') {
        overlay.classList.add('sk-cw-closing');
        setTimeout(function() { overlay.remove(); }, 280);
      }
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.classList.add('sk-cw-closing');
        setTimeout(function() { overlay.remove(); }, 280);
      }
    });

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    // Hook into settings panel opening
    document.addEventListener('click', function(e) {
      if (e.target.id === 'settingsBtn' || e.target.closest('#settingsBtn')) {
        setTimeout(addSettingsSection, 150);
      }
    });

    // Update chat dropdown on load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(updateTargetDropdown, 500);
      });
    } else {
      setTimeout(updateTargetDropdown, 500);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  window.ChannelOnboarding = {
    open: open,
    close: close,
    getConnectedChannels: function() {
      var connected = getConnected();
      return Object.keys(connected).map(function(id) {
        return Object.assign({ id: id }, connected[id]);
      });
    },
    channels: CHANNELS,
    openQuickConnect: openQuickConnect,
    isChannelConnected: isConnected
  };

  init();
})();
