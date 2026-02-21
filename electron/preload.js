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
  sendMission: (task, targetAgent) => ipcRenderer.invoke('spawnkit:sendMission', task, targetAgent),
  invalidateCache: () => ipcRenderer.invoke('spawnkit:invalidateCache'),
  onUpdate: (callback) => ipcRenderer.on('spawnkit:update', (_, data) => callback(data)),
  
  // Per-agent data (FIX #1, #5)
  getAgentTodos: (agentId) => ipcRenderer.invoke('spawnkit:getAgentTodos', agentId),
  getAgentSkills: (agentId) => ipcRenderer.invoke('spawnkit:getAgentSkills', agentId),
  getAgentMetrics: (agentId) => ipcRenderer.invoke('spawnkit:getAgentMetrics', agentId),
  
  // Active subagents (FIX #7)
  getActiveSubagents: () => ipcRenderer.invoke('spawnkit:getActiveSubagents'),
  
  // Agent logs — real-time log viewer (SS+ FIX #1)
  getAgentLogs: (agentId, limit) => ipcRenderer.invoke('spawnkit:getAgentLogs', agentId, limit),
  
  // Agent editing (NEW #4)
  saveAgentSoul: (agentId, data) => ipcRenderer.invoke('spawnkit:saveAgentSoul', agentId, data),
  
  // Skills management (NEW #1)
  saveAgentSkills: (agentId, skills) => ipcRenderer.invoke('spawnkit:saveAgentSkills', agentId, skills),
  listAvailableSkills: () => ipcRenderer.invoke('spawnkit:listAvailableSkills'),
  
  // API key management (NEW #3)
  getApiKeys: () => ipcRenderer.invoke('spawnkit:getApiKeys'),
  saveApiKey: (provider, apiKey) => ipcRenderer.invoke('spawnkit:saveApiKey', provider, apiKey),
  deleteApiKey: (provider) => ipcRenderer.invoke('spawnkit:deleteApiKey', provider)
});

// Platform detection
contextBridge.exposeInMainWorld('platform', {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
});
