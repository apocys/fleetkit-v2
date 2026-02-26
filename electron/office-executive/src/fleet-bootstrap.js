/* Fleet Client Auto-Bootstrap
   Loads after fleet-client.js — auto-connects to the relay */
(function() {
    'use strict';
    
    // Default config — connects to production relay
    var FLEET_CONFIG = {
        relayUrl: 'wss://fleet.spawnkit.ai/ws/fleet',
        token: 'sk-fleet-d74ca1f7a1b8136cb96041cef3d415bdcac948615188f5a2',
        officeId: 'apomac',
        officeName: 'ApoMac HQ',
        officeEmoji: '🍎'
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
