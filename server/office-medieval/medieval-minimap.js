(function() {
    'use strict';

    var canvas, ctx, container;
    var MAP_SIZE = 140; // pixels
    var WORLD_SIZE = 50; // units (-25 to 25 range covers most of the map)
    var UPDATE_INTERVAL = 500; // ms

    function init() {
        container = document.createElement('div');
        container.id = 'minimap-overlay';
        container.style.cssText = 'position:fixed;top:60px;right:8px;z-index:100;border-radius:8px;overflow:hidden;border:2px solid rgba(201,169,89,0.5);box-shadow:0 4px 16px rgba(0,0,0,0.4);pointer-events:none;display:none;';

        canvas = document.createElement('canvas');
        canvas.width = MAP_SIZE;
        canvas.height = MAP_SIZE;
        container.appendChild(canvas);
        document.body.appendChild(container);

        ctx = canvas.getContext('2d');

        setInterval(render, UPDATE_INTERVAL);
    }

    function worldToMap(x, z) {
        return {
            x: (x / WORLD_SIZE + 0.5) * MAP_SIZE,
            y: (z / WORLD_SIZE + 0.5) * MAP_SIZE
        };
    }

    function render() {
        var app = window.castleApp;
        if (!app || container.style.display === 'none') return;

        ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

        // Background (dark terrain)
        ctx.fillStyle = 'rgba(20, 30, 20, 0.85)';
        ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

        // Draw terrain features
        // Castle walls (inner: ±7, outer: ±11)
        ctx.strokeStyle = 'rgba(168, 162, 153, 0.5)';
        ctx.lineWidth = 1;
        var innerTL = worldToMap(-7, -7);
        var innerBR = worldToMap(7, 7);
        ctx.strokeRect(innerTL.x, innerTL.y, innerBR.x - innerTL.x, innerBR.y - innerTL.y);

        var outerTL = worldToMap(-11, -11);
        var outerBR = worldToMap(11, 11);
        ctx.strokeRect(outerTL.x, outerTL.y, outerBR.x - outerTL.x, outerBR.y - outerTL.y);

        // River (z=12)
        ctx.strokeStyle = 'rgba(51, 136, 204, 0.6)';
        ctx.lineWidth = 3;
        var riverL = worldToMap(-25, 12);
        var riverR = worldToMap(25, 12);
        ctx.beginPath();
        ctx.moveTo(riverL.x, riverL.y);
        ctx.lineTo(riverR.x, riverR.y);
        ctx.stroke();

        // Draw buildings
        var buildingColors = {
            '\u2694\uFE0F Mission Hall': '#CC3333',
            '\uD83C\uDF7A Tavern': '#CC8833',
            '\uD83D\uDCDA Library': '#3366CC',
            '\uD83D\uDD28 Forge Workshop': '#666666',
            '\uD83C\uDFEA Market': '#33AA55',
            '\uD83C\uDFE0 Chapel': '#FFFFEE',
        };

        if (app.buildingGroups) {
            app.buildingGroups.forEach(function(bg) {
                var name = bg.userData.buildingName;
                var color = buildingColors[name] || '#888';
                var pos = worldToMap(bg.position.x, bg.position.z);
                ctx.fillStyle = color;
                ctx.fillRect(pos.x - 3, pos.y - 3, 6, 6);
            });
        }

        // Draw keep (center)
        var keepPos = worldToMap(0, 0);
        ctx.fillStyle = '#c9a959';
        ctx.fillRect(keepPos.x - 4, keepPos.y - 4, 8, 8);

        // Draw agents
        var agentColors = {
            'Sycopa': '#007AFF', 'Forge': '#FF9F0A', 'Atlas': '#BF5AF2',
            'Hunter': '#FF453A', 'Echo': '#0A84FF', 'Sentinel': '#30D158',
        };

        app.characterModels.forEach(function(charData, agentId) {
            var pos = worldToMap(charData.group.position.x, charData.group.position.z);
            var color = agentColors[agentId] || '#fff';

            // Agent dot
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            ctx.fill();

            // Name label
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '7px sans-serif';
            ctx.fillText(agentId.substring(0, 3), pos.x + 4, pos.y + 2);
        });

        // Draw animals as tiny dots
        if (app.animals) {
            ctx.fillStyle = 'rgba(255, 255, 200, 0.4)';
            app.animals.forEach(function(a) {
                var pos = worldToMap(a.mesh.position.x, a.mesh.position.z);
                ctx.fillRect(pos.x - 1, pos.y - 1, 2, 2);
            });
        }

        // Camera viewport indicator
        if (app.controls && app.controls.target) {
            var camPos = worldToMap(app.controls.target.x, app.controls.target.z);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(camPos.x - 15, camPos.y - 10, 30, 20);
        }
    }

    window.toggleMinimap = function() {
        if (!container) init();
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    };

    // Initialize on load
    setTimeout(init, 3000);

    // Hook into hotbar key 4 (Map)
    setTimeout(function() {
        var hotbar = document.getElementById('roblox-hotbar');
        if (hotbar && hotbar.children[3]) {
            var oldSlot = hotbar.children[3];
            var newSlot = oldSlot.cloneNode(true);
            oldSlot.parentNode.replaceChild(newSlot, oldSlot);
            newSlot.addEventListener('click', function() { window.toggleMinimap(); });
            newSlot.addEventListener('mouseenter', function() { newSlot.style.borderColor = 'rgba(255,200,50,0.6)'; newSlot.style.transform = 'translateY(-2px)'; });
            newSlot.addEventListener('mouseleave', function() { newSlot.style.borderColor = 'rgba(255,255,255,0.15)'; newSlot.style.transform = 'none'; });
        }
    }, 3000);
})();
