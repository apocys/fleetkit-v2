// Auto-detect local OpenClaw gateway
(function() {
  var stored = {};
  try { stored = JSON.parse(localStorage.getItem('spawnkit-config') || '{}'); } catch(e) {}

  // Priority: production = always same-origin; else localStorage > URL params > defaults
  var params = new URLSearchParams(window.location.search);
  var isProduction = window.location.hostname.includes('spawnkit.ai');
  var relayUrl;
  if (isProduction) {
      relayUrl = window.location.origin; // ALWAYS same-origin in production
  } else {
      var defaultUrl = 'http://127.0.0.1:8222';
      relayUrl = stored.relayUrl || params.get('relay') || defaultUrl;
  }
  // Make API URL available globally for all panels
  if (!window.OC_API_URL) window.OC_API_URL = relayUrl;
  var relayToken = stored.relayToken || params.get('token') || '';

  window.OC_RELAY_URL = relayUrl;
  if (relayToken) window.OC_RELAY_TOKEN = relayToken;

  console.debug('🔌 SpawnKit Local: relay=' + relayUrl + ' token=' + (relayToken ? '***' : 'none'));
})();
