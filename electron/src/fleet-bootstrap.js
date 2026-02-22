/* Fleet Client Auto-Bootstrap
   Loads after fleet-client.js — auto-connects to the relay */
(function() {
    'use strict';
    
    // Default config — connects to production relay
    // ⚠️ TOKEN: Do NOT hardcode tokens here. Pass via electron main process or env.
    // Set window.FLEET_TOKEN before this script loads, or configure via fleet-config.json
    var FLEET_CONFIG = {
        relayUrl: 'wss://fleet.spawnkit.ai/ws/fleet',
        token: window.FLEET_TOKEN || '',  // injected by Electron main process
        officeId: window.FLEET_OFFICE_ID || 'apomac',
        officeName: window.FLEET_OFFICE_NAME || 'ApoMac HQ',
        officeEmoji: window.FLEET_OFFICE_EMOJI || '🍎'
    };
    
    // Wait for DOM + SpawnKitPanels to be ready
    function boot() {
        if (typeof window.FleetClient === 'undefined') {
            console.warn('🏙️ FleetClient not loaded — skipping fleet bootstrap');
            return;
        }
        
        console.log('🏙️ Fleet bootstrap: connecting to relay...');
        FleetClient.init(FLEET_CONFIG);
        
        // Wire events to SpawnKit panels
        FleetClient.on('connected', function() {
            console.log('🏙️ Fleet: CONNECTED to relay');
            if (window.SpawnKitPanels) {
                SpawnKitPanels.showToast('🏙️ Connected to Fleet Relay');
            }
        });
        
        FleetClient.on('disconnected', function() {
            console.log('🏙️ Fleet: Disconnected');
        });
        
        FleetClient.on('office:update', function(msg) {
            console.log('🏙️ Office update:', msg.office);
            // Auto-refresh Remote panel if open
            var remoteOverlay = document.getElementById('spawnkitRemoteOverlay');
            if (remoteOverlay && remoteOverlay.classList.contains('open') && window.SpawnKitPanels) {
                SpawnKitPanels.openRemoteOverlay();
            }
        });
        
        FleetClient.on('message:new', function(msg) {
            if (window.SpawnKitPanels) {
                SpawnKitPanels.showToast('📬 New message from ' + (msg.message ? msg.message.from : 'unknown'));
            }
        });
    }
    
    // Boot when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(boot, 500); });
    } else {
        setTimeout(boot, 500);
    }
})();
