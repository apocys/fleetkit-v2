const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Setup wizard
  detectWorkspace: () => ipcRenderer.invoke('detect-workspace'),
  detectOpenClawConfig: () => ipcRenderer.invoke('detect-openclaw-config'),
  testConnection: (provider, apiKey) => ipcRenderer.invoke('test-connection', provider, apiKey),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  completeSetup: (config) => ipcRenderer.invoke('complete-setup', config),
  getDefaultWorkspace: () => ipcRenderer.invoke('detect-workspace').then(r => r.path),

  // Version info
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),

  // Directory browser (both names for compatibility)
  browseDirectory: () => ipcRenderer.invoke('browse-directory'),
  browseFolder: () => ipcRenderer.invoke('browse-directory'),

  // Menu events
  onToggleAgents: (callback) => {
    ipcRenderer.on('toggle-agents', callback);
    return () => ipcRenderer.removeListener('toggle-agents', callback);
  },

  // Theme switching
  switchTheme: (theme) => ipcRenderer.invoke('switch-theme', theme),
  getCurrentTheme: () => ipcRenderer.invoke('get-current-theme'),

  // Settings
  detectOpenclawConfig: () => ipcRenderer.invoke('detect-openclaw-config'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Agent Builder
  openAgentBuilder: () => ipcRenderer.invoke('open-agent-builder'),

  // Preferences
  onOpenPreferences: (callback) => {
    ipcRenderer.on('open-preferences', callback);
    return () => ipcRenderer.removeListener('open-preferences', callback);
  }
});

// SpawnKit data API (if data-provider is loaded)
contextBridge.exposeInMainWorld('spawnkitAPI', {
  isAvailable: () => ipcRenderer.invoke('spawnkit:isAvailable'),
  getSessions: () => ipcRenderer.invoke('spawnkit:getSessions'),
  getCrons: () => ipcRenderer.invoke('spawnkit:getCrons'),
  getMemory: () => ipcRenderer.invoke('spawnkit:getMemory'),
  getAgentInfo: (id) => ipcRenderer.invoke('spawnkit:getAgentInfo', id),
  getMetrics: () => ipcRenderer.invoke('spawnkit:getMetrics'),
  getAll: () => ipcRenderer.invoke('spawnkit:getAll'),
  getTranscript: (sessionKey, limit) => ipcRenderer.invoke('spawnkit:getTranscript', sessionKey, limit),
  getTodoList: () => ipcRenderer.invoke('spawnkit:getTodoList'),
  getSkills: () => ipcRenderer.invoke('spawnkit:getSkills'),
  sendMission: (task) => ipcRenderer.invoke('spawnkit:sendMission', task),
  invalidateCache: () => ipcRenderer.invoke('spawnkit:invalidateCache'),
  onUpdate: (callback) => ipcRenderer.on('spawnkit:update', (_, data) => callback(data))
});

// Platform detection
contextBridge.exposeInMainWorld('platform', {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
});
