// medieval-integration.js — integrates routines, bubbles, and chat into the Medieval Castle theme
// Runs after all other scripts. ES5 only. No import/require.

(function() {
  'use strict';

  var medievalAdapter = {
    getBuildings: function() {
      return [
        { id: 'keep',     name: 'Great Keep',     position: {x:0,  y:0, z:0},  type: 'work'           },
        { id: 'tavern',   name: 'Tavern',          position: {x:-3, y:0, z:3},  type: 'tavern'         },
        { id: 'quarters', name: 'Barracks',        position: {x:3,  y:0, z:-3}, type: 'quarters'       },
        { id: 'training', name: 'Training Yard',   position: {x:-4, y:0, z:-2}, type: 'training_ground'},
        { id: 'library',  name: 'Scriptorium',     position: {x:2,  y:0, z:2},  type: 'library'        },
        { id: 'portal',   name: 'Castle Gate',     position: {x:0,  y:0, z:6},  type: 'portal'         },
      ];
    },

    getWaypoints: function() {
      return [
        {x:0,  y:0, z:0},  {x:-3, y:0, z:-3}, {x:3,  y:0, z:3},
        {x:-3, y:0, z:3},  {x:3,  y:0, z:-3}, {x:0,  y:0, z:4},
        {x:-4, y:0, z:0},  {x:4,  y:0, z:0},  {x:0,  y:0, z:-4},
        {x:-2, y:0, z:1},  {x:1,  y:0, z:-2}, {x:2,  y:0, z:2},
      ];
    },

    moveAgent: function(agentId, position, callback) {
      var charData = window.castleApp && window.castleApp.characterModels.get(agentId);
      if (!charData) { if (callback) callback(); return; }
      charData._routineTarget   = { x: position.x, z: position.z };
      charData._routineCallback = callback || null;
    },

    getAgentPosition: function(agentId) {
      var charData = window.castleApp && window.castleApp.characterModels.get(agentId);
      if (!charData) return { x: 0, y: 0, z: 0 };
      return { x: charData.group.position.x, y: 0, z: charData.group.position.z };
    },

    showBubble: function(agentId, text, emoji) {
      if (window.ActivityBubbles) window.ActivityBubbles.show(agentId, text, emoji);
    },

    hideBubble: function(agentId) {
      if (window.ActivityBubbles) window.ActivityBubbles.hide(agentId);
    },

    showProgress: function(agentId, percent) {
      if (window.ActivityBubbles) window.ActivityBubbles.showProgress(agentId, percent);
    },

    hideProgress: function(agentId) {
      if (window.ActivityBubbles) window.ActivityBubbles.hideProgress(agentId);
    },

    playAnimation: function(agentId, animName) {
      var charData = window.castleApp && window.castleApp.characterModels.get(agentId);
      if (!charData || !charData.mixer) return;
      var clipName = (animName === 'walk' || animName === 'eat' || animName === 'talk') ? 'walk' : 'idle';
      if (animName === 'work' || animName === 'sleep' || animName === 'exercise') clipName = 'idle';
      var clip = null;
      for (var i = 0; i < charData.animations.length; i++) {
        if (charData.animations[i].name === clipName) { clip = charData.animations[i]; break; }
      }
      if (!clip) clip = charData.animations[0];
      if (!clip) return;
      charData.mixer.stopAllAction();
      var action = charData.mixer.clipAction(clip);
      action.timeScale = (clipName === 'idle') ? 0.5 : (0.6 + charData.speed * 0.8);
      action.play();
    },

    getBuildingByType: function(type) {
      var buildings = this.getBuildings();
      for (var i = 0; i < buildings.length; i++) {
        if (buildings[i].type === type) return buildings[i];
      }
      return null;
    },

    getNearestAgent: function(agentId) {
      if (!window.castleApp) return null;
      var pos = this.getAgentPosition(agentId);
      var nearest = null, minDist = Infinity;
      window.castleApp.characterModels.forEach(function(charData, otherId) {
        if (otherId === agentId) return;
        var oPos = charData.group.position;
        var dist = Math.sqrt(Math.pow(oPos.x - pos.x, 2) + Math.pow(oPos.z - pos.z, 2));
        if (dist < minDist) { minDist = dist; nearest = otherId; }
      });
      return nearest;
    },
  };

  // ── Monkey-patch animateCharacters ──────────────────────────────────────────
  var origAnimate = window.CastleApp && window.CastleApp.prototype.animateCharacters;

  if (window.CastleApp) {
    window.CastleApp.prototype.animateCharacters = function(delta, elapsed) {
      var self = this;
      this.characterModels.forEach(function(charData, agentId) {
        var group = charData.group;
        if (charData._routineTarget) {
          var target = charData._routineTarget;
          var dx = target.x - group.position.x;
          var dz = target.z - group.position.z;
          var dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 0.3) {
            group.position.x = target.x;
            group.position.z = target.z;
            var cb = charData._routineCallback;
            charData._routineTarget = null;
            charData._routineCallback = null;
            if (cb) cb();
          } else {
            var step = Math.min(delta * charData.speed * 1.5, dist);
            group.position.x += (dx / dist) * step;
            group.position.z += (dz / dist) * step;
            var tAngle = Math.atan2(dx, dz);
            var diff = tAngle - group.rotation.y;
            while (diff >  Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            group.rotation.y += diff * Math.min(delta * 5, 1);
          }
        } else {
          var waypoints = charData.waypoints;
          var from = waypoints[charData.waypointIndex];
          var to   = waypoints[charData.nextWaypointIndex];
          charData.progress += delta * charData.speed * 0.3;
          if (charData.progress >= 1) {
            charData.progress = 0;
            charData.waypointIndex     = charData.nextWaypointIndex;
            charData.nextWaypointIndex = (charData.nextWaypointIndex + 1) % waypoints.length;
          }
          var t = charData.progress * charData.progress * (3 - 2 * charData.progress);
          group.position.set(
            from.x + (to.x - from.x) * t, 0,
            from.z + (to.z - from.z) * t
          );
          var ddx = to.x - from.x, ddz = to.z - from.z;
          if (Math.abs(ddx) > 0.01 || Math.abs(ddz) > 0.01) {
            var ang = Math.atan2(ddx, ddz);
            var d = ang - group.rotation.y;
            while (d >  Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            group.rotation.y += d * Math.min(delta * 5, 1);
          }
        }
        // Glow for selected agent
        if (agentId === self.selectedAgent) {
          if (!charData.glowMesh) self.addGlowToCharacter(charData);
          if (charData.glowMesh) charData.glowMesh.material.opacity = 0.3 + Math.sin(elapsed * 4) * 0.15;
        } else if (charData.glowMesh) {
          group.remove(charData.glowMesh);
          charData.glowMesh.geometry.dispose();
          charData.glowMesh.material.dispose();
          charData.glowMesh = null;
        }
      });
    };
  }

  // ── Monkey-patch updateLabels ───────────────────────────────────────────────
  if (window.CastleApp) {
    var origUpdateLabels = window.CastleApp.prototype.updateLabels;
    window.CastleApp.prototype.updateLabels = function() {
      origUpdateLabels.call(this);
      if (!window.ActivityBubbles) return;
      var container = document.getElementById('scene-container');
      if (!container) return;
      var rect   = container.getBoundingClientRect();
      var camera = this.camera;
      this.characterModels.forEach(function(charData, agentId) {
        var pos = new THREE.Vector3();
        charData.group.getWorldPosition(pos);
        pos.y += 3.4;
        var projected = pos.clone().project(camera);
        var x = (projected.x * 0.5 + 0.5) * rect.width;
        var y = (-projected.y * 0.5 + 0.5) * rect.height;
        window.ActivityBubbles.updatePosition(agentId, x, y);
      });
    };
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  function initIntegration() {
    var app = window.castleApp;
    if (!app || !app.characterModels || app.characterModels.size === 0) {
      setTimeout(initIntegration, 1000);
      return;
    }

    if (window.ActivityBubbles) {
      window.ActivityBubbles.init(document.getElementById('labels-container'));
      window.ActivityBubbles.setTheme('medieval');
    }

    if (window.AgentRoutines) {
      var agents = [];
      app.characterModels.forEach(function(charData, agentId) {
        agents.push({ id: agentId, building: null });
      });
      window.AgentRoutines.init(medievalAdapter, agents);
      window.AgentRoutines.start();
    }

    if (window.ThemeChat) {
      var chatContainer = document.getElementById('medievalChat');
      if (!chatContainer) {
        chatContainer = document.createElement('div');
        chatContainer.id = 'medievalChat';
        chatContainer.style.cssText = 'position:fixed;right:0;bottom:0;width:380px;height:500px;z-index:100;display:none;';
        document.body.appendChild(chatContainer);
      }
      window.ThemeChat.init(chatContainer, {
        theme:          'medieval',
        placeholder:    'Your command, Your Majesty...',
        userLabel:      'Your Majesty',
        assistantLabel: '🤖 ApoMac',
      });

      var origSelect = app.selectAgent.bind(app);
      app.selectAgent = function(agentId) {
        origSelect(agentId);
        if (agentId === 'ApoMac' || agentId === 'ceo') {
          chatContainer.style.display = 'block';
          window.ThemeChat.show();
        }
      };

      var toggleBtn = document.createElement('button');
      toggleBtn.className  = 'control-btn';
      toggleBtn.title      = 'Royal Messenger';
      toggleBtn.textContent = '💬';
      toggleBtn.style.cssText = 'display:none;'; // Hidden — hotbar key 2 handles chat
      toggleBtn.addEventListener('click', function() {
        if (chatContainer.style.display === 'none') {
          chatContainer.style.display = 'block';
          window.ThemeChat.show();
        } else {
          chatContainer.style.display = 'none';
          window.ThemeChat.hide();
        }
      });
      document.body.appendChild(toggleBtn);
    }

    setInterval(function() {
      if (!window.ThemeAuth) return;
      window.ThemeAuth.fetch(API_URL + '/api/oc/sessions').then(function(resp) {
        if (!resp.ok) return null;
        return resp.json();
      }).then(function(data) {
        if (!data || !window.AgentRoutines) return;
        var sessions = data.sessions || data || [];
        sessions.forEach(function(s) {
          if (s.kind !== 'subagent' || s.status !== 'active') return;
          var label = (s.label || '').toLowerCase();
          app.characterModels.forEach(function(charData, agentId) {
            if (label.indexOf(agentId.toLowerCase()) >= 0) {
              window.AgentRoutines.onTask(agentId, { name: s.label || 'Working...', progress: 0 });
            }
          });
        });
      }).catch(function() {});
    }, 10000);

    // ── WS-3: Agent Drag ────────────────────────────────────
    if (window.AgentDrag) {
      window.AgentDrag.init({
        container: document.getElementById('scene-container'),
        theme: 'medieval',
        getAgentAtPoint: function(x, y) {
          if (!app.raycaster || !app.camera) return null;
          var rect = app.renderer.domElement.getBoundingClientRect();
          app.mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
          app.mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
          app.raycaster.setFromCamera(app.mouse, app.camera);
          var intersects = app.raycaster.intersectObjects(app.scene.children, true);
          for (var i = 0; i < intersects.length; i++) {
            if (intersects[i].object.userData && intersects[i].object.userData.agentId) {
              return intersects[i].object.userData.agentId;
            }
          }
          return null;
        },
        getAgentScreenPos: function(agentId) {
          var charData = app.characterModels.get(agentId);
          if (!charData) return { x: 0, y: 0 };
          var pos = new THREE.Vector3();
          charData.group.getWorldPosition(pos);
          pos.project(app.camera);
          var rect = app.renderer.domElement.getBoundingClientRect();
          return { x: (pos.x * 0.5 + 0.5) * rect.width, y: (-pos.y * 0.5 + 0.5) * rect.height };
        },
        getBuildingAtPoint: function() { return null; },
      });
      window.AgentDrag.onClick(function(agentId) { app.selectAgent(agentId); });
      window.AgentDrag.onDrop(function(agentId, pos) {
        var charData = app.characterModels.get(agentId);
        if (!charData) return;
        var rect = app.renderer.domElement.getBoundingClientRect();
        var ndcX = ((pos.x - rect.left) / rect.width) * 2 - 1;
        var ndcY = -((pos.y - rect.top) / rect.height) * 2 + 1;
        app.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), app.camera);
        var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        var target = new THREE.Vector3();
        app.raycaster.ray.intersectPlane(plane, target);
        if (target) {
          charData._routineTarget = { x: target.x, z: target.z };
          charData._routineCallback = null;
        }
      });
    }

    // ── WS-4: Kanban Board ───────────────────────────────────
    if (window.KanbanBoard) {
      var kanbanContainer = document.createElement('div');
      kanbanContainer.id = 'medievalKanban';
      kanbanContainer.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:150;display:none;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);';
      document.body.appendChild(kanbanContainer);
      var kanbanInner = document.createElement('div');
      kanbanInner.style.cssText = 'width:90%;max-width:1000px;height:80vh;margin:10vh auto;';
      kanbanContainer.appendChild(kanbanInner);

      var agentList = [];
      app.characterModels.forEach(function(cd, aid) { agentList.push({ id: aid, name: aid, emoji: '⚔️' }); });
      window.KanbanBoard.init(kanbanInner, { theme: 'medieval', agents: agentList, storageKey: 'spawnkit-medieval-missions' });

      kanbanContainer.addEventListener('click', function(e) { if (e.target === kanbanContainer) { kanbanContainer.style.display = 'none'; window.KanbanBoard.hide(); } });

      var kanbanBtn = document.createElement('button');
      kanbanBtn.className = 'control-btn';
      kanbanBtn.title = 'Quest Board';
      kanbanBtn.textContent = '📋';
      kanbanBtn.style.cssText = 'display:none;'; // Hidden — hotbar key 3 handles skills
      kanbanBtn.addEventListener('click', function() { kanbanContainer.style.display = kanbanContainer.style.display === 'none' ? 'block' : 'none'; });
      document.body.appendChild(kanbanBtn);
    }

    // ── WS-5: Customization Panel ────────────────────────────
    if (window.ThemeCustomize) {
      var agentData = [];
      app.characterModels.forEach(function(cd, aid) { agentData.push({ id: aid, name: aid, emoji: '⚔️', role: 'Knight' }); });
      var buildings = medievalAdapter.getBuildings();
      window.ThemeCustomize.init({
        theme: 'medieval',
        agents: agentData,
        buildings: buildings,
        characters: [],
        storageKey: 'spawnkit-medieval-custom',
      });

      var customBtn = document.createElement('button');
      customBtn.className = 'control-btn';
      customBtn.title = 'Customize';
      customBtn.textContent = '⚙️';
      customBtn.style.cssText = 'display:none;'; // Hidden — hotbar key 5 handles settings
      customBtn.addEventListener('click', function() { window.ThemeCustomize.toggle(); });
      document.body.appendChild(customBtn);

      window.ThemeCustomize.onUpdate(function(config) {
        if (config.agentNames) {
          Object.keys(config.agentNames).forEach(function(aid) {
            var label = app.labelElements.get(aid);
            if (label) label.textContent = config.agentNames[aid];
          });
        }
        if (config.agentBuildings && window.AgentRoutines) {
          Object.keys(config.agentBuildings).forEach(function(aid) {
            var state = window.AgentRoutines.getState(aid);
            if (state) state.building = config.agentBuildings[aid];
          });
        }
      });
    }

    console.log('🏰 Medieval integration: routines + bubbles + chat + drag + kanban + customize active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initIntegration, 2000); });
  } else {
    setTimeout(initIntegration, 2000);
  }

})();
