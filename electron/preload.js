const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Setup wizard
  detectWorkspace: () => ipcRenderer.invoke('detect-workspace'),
  testConnection: (provider, apiKey) => ipcRenderer.invoke('test-connection', provider, apiKey),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  completeSetup: (config) => ipcRenderer.invoke('complete-setup', config),

  // Version info
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),

  // Directory browser
  browseDirectory: () => ipcRenderer.invoke('browse-directory'),

  // Menu events
  onToggleAgents: (callback) => {
    ipcRenderer.on('toggle-agents', callback);
    return () => ipcRenderer.removeListener('toggle-agents', callback);
  }
});

// FleetKit data API (if data-provider is loaded)
contextBridge.exposeInMainWorld('fleetkitAPI', {
  isAvailable: () => ipcRenderer.invoke('fleetkit:isAvailable'),
  getSessions: () => ipcRenderer.invoke('fleetkit:getSessions'),
  getCrons: () => ipcRenderer.invoke('fleetkit:getCrons'),
  getMemory: () => ipcRenderer.invoke('fleetkit:getMemory'),
  getAgentInfo: (id) => ipcRenderer.invoke('fleetkit:getAgentInfo', id),
  getMetrics: () => ipcRenderer.invoke('fleetkit:getMetrics'),
  getAll: () => ipcRenderer.invoke('fleetkit:getAll'),
  getTranscript: (sessionId, limit) => ipcRenderer.invoke('fleetkit:getTranscript', sessionId, limit),
  sendMission: (task) => ipcRenderer.invoke('fleetkit:sendMission', task),
  invalidateCache: () => ipcRenderer.invoke('fleetkit:invalidateCache'),
  onUpdate: (callback) => ipcRenderer.on('fleetkit:update', (_, data) => callback(data))
});

// Platform detection
contextBridge.exposeInMainWorld('platform', {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
});
