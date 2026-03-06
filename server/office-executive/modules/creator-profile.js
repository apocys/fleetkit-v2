/* ═══════════════════════════════════════════════════════════════
   FEATURE 5: Creator Profile
   ═══════════════════════════════════════════════════════════════ */
(function() {
    'use strict';

    function escCp(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function getVillageName() {
        return localStorage.getItem('spawnkit-village-name') || 'My Village';
    }
    function setVillageName(name) {
        localStorage.setItem('spawnkit-village-name', name);
    }
    function getOwnerName() {
        try {
            var cfg = JSON.parse(localStorage.getItem('spawnkit-config') || '{}');
            return cfg.userName || cfg.ownerName || cfg.name || 'Village Owner';
        } catch(e) { return 'Village Owner'; }
    }
    function getCreatedDate() {
        var ts = localStorage.getItem('spawnkit-created');
        if (!ts) {
            ts = new Date().toISOString();
            localStorage.setItem('spawnkit-created', ts);
        }
        try {
            return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch(e) { return ts.substring(0, 10); }
    }

    function renderCreatorProfile() {
        var body = document.getElementById('creatorProfileBody');
        if (!body) return;
        var villageName = getVillageName();
        var ownerName = getOwnerName();
        var createdDate = getCreatedDate();
        var initial = villageName.charAt(0).toUpperCase() || '🏡';

        var html = '';
        html += '<div class="cp-avatar-row">';
        html += '<div class="cp-avatar-circle">' + escCp(initial) + '</div>';
        html += '<div>';
        html += '<div class="cp-village-name">' + escCp(villageName) + '</div>';
        html += '<div class="cp-village-sub">SpawnKit Village</div>';
        html += '</div></div>';

        html += '<div class="cp-row"><span class="cp-row-label">Village Name</span>';
        html += '<input class="cp-edit-input" id="cpVillageNameInput" type="text" value="' + escCp(villageName) + '" placeholder="My Village" /></div>';

        html += '<div class="cp-row"><span class="cp-row-label">Owner</span>';
        html += '<span class="cp-row-value">' + escCp(ownerName) + '</span></div>';

        html += '<div class="cp-row"><span class="cp-row-label">Theme</span>';
        html += '<span class="cp-row-value">🏢 Executive</span></div>';

        html += '<div class="cp-row"><span class="cp-row-label">Created</span>';
        html += '<span class="cp-row-value">' + escCp(createdDate) + '</span></div>';

        html += '<button class="cp-share-btn" id="cpShareBtn">🔗 Share Village</button>';
        body.innerHTML = html;

        var nameInput = document.getElementById('cpVillageNameInput');
        if (nameInput) {
            nameInput.addEventListener('change', function() {
                var newName = nameInput.value.trim() || 'My Village';
                setVillageName(newName);
                var toast = document.getElementById('execToast');
                if (toast) {
                    toast.textContent = '✅ Village name saved!';
                    toast.classList.add('visible');
                    setTimeout(function() { toast.classList.remove('visible'); }, 2000);
                }
                renderCreatorProfile(); // Re-render to update avatar
            });
        }

        var shareBtn = document.getElementById('cpShareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', function() {
                var shareUrl = window.location.origin + '/?village=' + encodeURIComponent(getVillageName());
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(shareUrl).then(function() {
                        var toast = document.getElementById('execToast');
                        if (toast) {
                            toast.textContent = '📋 Village URL copied to clipboard!';
                            toast.classList.add('visible');
                            setTimeout(function() { toast.classList.remove('visible'); }, 2500);
                        }
                    }).catch(function() {
                        prompt('Copy this village URL:', shareUrl);
                    });
                } else {
                    prompt('Copy this village URL:', shareUrl);
                }
            });
        }
    }

    window.openCreatorProfile = openCreatorProfile;
    window.closeCreatorProfile = closeCreatorProfile;
    function closeCreatorProfile() {
        var overlay = document.getElementById('creatorProfileOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }
    function openCreatorProfile() {
        var overlay = document.getElementById('creatorProfileOverlay');
        if (!overlay) return;
        if (typeof window.closeAllPanels === 'function') window.closeAllPanels();
        ['marketplaceOverlay', 'skillsOverlay'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.classList.remove('open');
        });
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderCreatorProfile();
    }
    function closeCreatorProfile() {
        var overlay = document.getElementById('creatorProfileOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Expose globally so settings panel can open it if desired
    window.openCreatorProfile = openCreatorProfile;

    document.addEventListener('DOMContentLoaded', function() {
        var closeBtn = document.getElementById('creatorProfileClose');
        if (closeBtn) closeBtn.addEventListener('click', closeCreatorProfile);
        var backdrop = document.getElementById('creatorProfileBackdrop');
        if (backdrop) backdrop.addEventListener('click', closeCreatorProfile);
    });
})();
