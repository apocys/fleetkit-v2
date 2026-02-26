window.FleetClient = (function() {
    'use strict';
    
    var ws = null;
    var config = {};
    var reconnectTimer = null;
    var heartbeatTimer = null;
    var offices = {};
    var mailbox = [];
    var listeners = {};
    
    function init(cfg) {
        // cfg = { relayUrl: 'ws://host:18790/ws/fleet', token: 'sk-fleet-xxx', officeId: 'apomac', officeName: 'ApoMac HQ', officeEmoji: '🍎' }
        config = cfg;
        connect();
    }
    
    function connect() {
        var url = config.relayUrl + '?token=' + encodeURIComponent(config.token);
        ws = new WebSocket(url);
        
        ws.onopen = function() {
            console.log('🏙️ FleetClient connected to relay');
            emit('connected');
            startHeartbeat();
            fetchInitialState();
        };
        
        ws.onmessage = function(event) {
            var msg = JSON.parse(event.data);
            handleMessage(msg);
        };
        
        ws.onclose = function() {
            console.log('🏙️ FleetClient disconnected, reconnecting in 5s...');
            emit('disconnected');
            stopHeartbeat();
            reconnectTimer = setTimeout(connect, 5000);
        };
        
        ws.onerror = function(err) {
            console.error('🏙️ FleetClient error:', err);
        };
    }
    
    function handleMessage(msg) {
        switch(msg.type) {
            case 'welcome':
                console.log('🏙️ Welcome:', msg);
                break;
            case 'office:update':
                offices[msg.office] = msg.data;
                emit('office:update', msg);
                break;
            case 'office:online':
            case 'office:offline':
                if (offices[msg.office]) offices[msg.office].status = msg.type === 'office:online' ? 'online' : 'offline';
                emit(msg.type, msg);
                break;
            case 'message:new':
                mailbox.push(msg.message);
                emit('message:new', msg);
                break;
        }
    }
    
    function fetchInitialState() {
        // Fetch current offices via REST (WS only sends updates)
        var httpUrl = config.relayUrl.replace('wss://', 'https://').replace('ws://', 'http://').replace('/ws/fleet', '');
        fetch(httpUrl + '/api/fleet/offices', {
            headers: { 'Authorization': 'Bearer ' + config.token }
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.offices) {
                var remoteIds = Object.keys(data.offices).filter(function(id) { return id !== config.officeId; });
                console.log('🏙️ Found', remoteIds.length, 'remote offices, fetching details...');
                
                // Fetch full state for each remote office
                remoteIds.forEach(function(id) {
                    fetch(httpUrl + '/api/fleet/office/' + id, {
                        headers: { 'Authorization': 'Bearer ' + config.token }
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(detail) {
                        // Normalize field names: REST uses name/emoji, panels expect officeName/officeEmoji
                        var officeData = detail.state || {};
                        officeData.officeName = officeData.officeName || detail.name || id;
                        officeData.officeEmoji = officeData.officeEmoji || detail.emoji || '🏢';
                        officeData.status = detail.status || 'offline';
                        officeData.agents = officeData.agents || [];
                        officeData.activeMissions = officeData.activeMissions || 0;
                        
                        offices[id] = officeData;
                        emit('office:update', { office: id, data: officeData });
                    })
                    .catch(function(err) {
                        console.warn('🏙️ Failed to fetch office', id, err);
                        // Store basic info from list
                        offices[id] = {
                            officeName: data.offices[id].name || id,
                            officeEmoji: data.offices[id].emoji || '🏢',
                            status: data.offices[id].status || 'offline',
                            agents: []
                        };
                        emit('office:update', { office: id, data: offices[id] });
                    });
                });
            }
        })
        .catch(function(err) {
            console.warn('🏙️ Failed to fetch initial state:', err);
        });
        
        // Also fetch mailbox
        fetch(httpUrl + '/api/fleet/mailbox', {
            headers: { 'Authorization': 'Bearer ' + config.token }
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.messages) {
                mailbox = data.messages;
                if (mailbox.length > 0) emit('mailbox:loaded', { count: mailbox.length });
            }
        })
        .catch(function(err) {
            console.warn('🏙️ Failed to fetch mailbox:', err);
        });
    }
    
    function startHeartbeat() {
        heartbeatTimer = setInterval(function() {
            sendHeartbeat();
        }, 60000);
        sendHeartbeat(); // Send immediately
    }
    
    function stopHeartbeat() {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
    }
    
    function sendHeartbeat() {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        
        // Collect local fleet state
        var state = getLocalFleetState();
        ws.send(JSON.stringify({
            type: 'heartbeat',
            state: state
        }));
    }
    
    function getLocalFleetState() {
        // Read from SpawnKitPanels or SpawnKit.data
        var panels = window.SpawnKitPanels;
        var agents = panels ? panels.getAgents() : {};
        var demo = panels ? panels.getDemoData() : {};
        
        return {
            officeId: config.officeId,
            officeName: config.officeName,
            officeEmoji: config.officeEmoji,
            timestamp: new Date().toISOString(),
            agents: Object.keys(agents).map(function(id) {
                var a = agents[id];
                return {
                    id: id,
                    name: a.name,
                    role: a.role,
                    emoji: a.emoji || '🤖',
                    status: a.status || 'active',
                    currentTask: a.task || 'Standby',
                    model: a.model || 'unknown'
                };
            }),
            activeMissions: (demo.missions || []).filter(function(m) { return m.status === 'running'; }).length,
            totalTokens: '252K',
            uptime: '8h'
        };
    }
    
    function sendMessage(toOffice, text, priority) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        ws.send(JSON.stringify({
            type: 'message:send',
            to: toOffice,
            message: {
                text: text,
                priority: priority || 'medium'
            }
        }));
        return true;
    }
    
    // Simple event emitter
    function on(event, callback) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
    }
    
    function emit(event, data) {
        (listeners[event] || []).forEach(function(cb) { cb(data); });
    }
    
    function getOffices() { return offices; }
    function getMailbox() { return mailbox; }
    function isConnected() { return ws && ws.readyState === WebSocket.OPEN; }
    
    function disconnect() {
        stopHeartbeat();
        if (reconnectTimer) clearTimeout(reconnectTimer);
        if (ws) ws.close();
    }
    
    return {
        init: init,
        sendMessage: sendMessage,
        getOffices: getOffices,
        getMailbox: getMailbox,
        isConnected: isConnected,
        disconnect: disconnect,
        on: on
    };
})();