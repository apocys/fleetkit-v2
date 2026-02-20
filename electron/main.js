const { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell, session, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// --- Singleton: prevent multiple instances ---
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// --- Persistent config via electron-store ---
let store;
try {
  const Store = require('electron-store');
  store = new Store({
    name: 'spawnkit-config',
    defaults: {
      setupComplete: false,
      theme: 'simcity',
      windowBounds: { width: 1400, height: 900 },
      windowPosition: null,
      workspace: path.join(os.homedir(), '.openclaw', 'workspace')
    }
  });
} catch (_) {
  // Fallback in-memory store if electron-store fails
  const _data = {
    setupComplete: false,
    theme: 'simcity',
    windowBounds: { width: 1400, height: 900 },
    windowPosition: null,
    workspace: path.join(os.homedir(), '.openclaw', 'workspace')
  };
  store = {
    get(k, d) { return _data[k] !== undefined ? _data[k] : d; },
    set(k, v) { _data[k] = v; },
    delete(k) { delete _data[k]; }
  };
}

let mainWindow = null;
let setupWindow = null;
let tray = null;
const isDev = !app.isPackaged;

// --- Deep link protocol ---
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('spawnkit', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('spawnkit');
}

// --- About panel ---
app.setAboutPanelOptions({
  applicationName: 'SpawnKit',
  applicationVersion: app.getVersion(),
  version: '2.0.0',
  copyright: '© 2025-2026 SpawnKit Team',
  website: 'https://spawnkit.ai',
  credits: 'Your AI executive team, on your desktop.'
});

// --- Helpers ---
function getIconPath() {
  const svgPath = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(svgPath)) return svgPath;
  return null;
}

function isSetupComplete() {
  return store.get('setupComplete', false);
}

function showError(title, message) {
  dialog.showErrorBox(title, message);
}

function resolveThemePath(theme) {
  const candidates = [
    // Packaged app: themes are siblings of main.js
    path.join(__dirname, `office-${theme}`, 'index.html'),
    // Development: themes are in parent directory
    path.join(__dirname, '..', `office-${theme}`, 'index.html'),
    // Fallback: executive theme (always exists)
    path.join(__dirname, 'office-executive', 'index.html'),
    path.join(__dirname, '..', 'office-executive', 'index.html'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function switchTheme(newTheme) {
  try {
    // Validate theme exists
    const themePath = resolveThemePath(newTheme);
    if (!themePath) {
      return { success: false, error: `Theme "${newTheme}" not found` };
    }

    // Save new theme
    store.set('theme', newTheme);

    // Reload window with new theme
    if (mainWindow) {
      mainWindow.loadFile(themePath);
      // Recreate menu to update checkmarks
      createMenu();
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// --- CSP headers ---
function setCSPHeaders() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
          "img-src 'self' data: blob: https:; " +
          "font-src 'self' data: https://fonts.gstatic.com; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "connect-src 'self' https: ws: wss:;"
        ]
      }
    });
  });
}

// --- Settings Window ---
function createSettingsWindow() {
  const settingsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    title: 'SpawnKit Settings',
    parent: mainWindow,
    modal: true
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    // Nothing to clean up
  });
}

// --- Agent Builder Window ---
function createAgentBuilderWindow() {
  const builderWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    title: 'SpawnKit — Agent Builder',
    parent: mainWindow,
  });

  builderWindow.loadFile(path.join(__dirname, 'agent-builder.html'));

  builderWindow.once('ready-to-show', () => {
    builderWindow.show();
  });
}

// --- Setup Window ---
function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    resizable: false,
    fullscreenable: false,
    maximizable: false
  });

  setupWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  setupWindow.once('ready-to-show', () => {
    setupWindow.show();
  });

  setupWindow.on('closed', () => {
    setupWindow = null;
    if (!mainWindow) {
      app.quit();
    }
  });
}

// --- Main Window ---
function createMainWindow() {
  const savedBounds = store.get('windowBounds', { width: 1400, height: 900 });
  const savedPosition = store.get('windowPosition', null);

  const windowOpts = {
    width: savedBounds.width,
    height: savedBounds.height,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    title: 'SpawnKit',
    backgroundColor: '#0f0f23'
  };

  if (savedPosition) {
    windowOpts.x = savedPosition.x;
    windowOpts.y = savedPosition.y;
  }

  mainWindow = new BrowserWindow(windowOpts);

  // Load appropriate theme
  const savedTheme = store.get('theme', 'simcity');
  const themePath = resolveThemePath(savedTheme);

  if (themePath) {
    mainWindow.loadFile(themePath);
  } else {
    mainWindow.loadURL(`data:text/html,<html><body style="background:#F2F2F7;color:#1C1C1E;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"><div style="text-align:center"><h1 style="color:#007AFF;font-size:2rem">SpawnKit</h1><p style="color:#8E8E93;margin-top:0.5rem">No theme files found. Please reinstall from <a href='https://download.spawnkit.ai' style='color:#007AFF'>download.spawnkit.ai</a></p></div></body></html>`);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Persist window state on move/resize
  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isMaximized() && !mainWindow.isFullScreen()) {
      const bounds = mainWindow.getBounds();
      store.set('windowBounds', { width: bounds.width, height: bounds.height });
    }
  });

  mainWindow.on('move', () => {
    if (mainWindow && !mainWindow.isMaximized() && !mainWindow.isFullScreen()) {
      const bounds = mainWindow.getBounds();
      store.set('windowPosition', { x: bounds.x, y: bounds.y });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// --- Application Menu ---
function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Check for Updates…',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Updates',
              message: 'SpawnKit is up to date.',
              detail: `Version ${app.getVersion()}`,
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences…',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            createSettingsWindow();
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Agent Builder…',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            createAgentBuilderWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: isMac ? undefined : 'CmdOrCtrl+,',
          click: () => {
            createSettingsWindow();
          },
          visible: !isMac
        },
        ...(isMac ? [] : [{ type: 'separator' }]),
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Agents',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('toggle-agents');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Theme',
          submenu: [
            {
              label: '🏙️ SimCity',
              type: 'checkbox',
              checked: store.get('theme', 'simcity') === 'simcity',
              click: async () => {
                const result = await switchTheme('simcity');
                if (!result.success) {
                  showError('Theme Error', result.error);
                }
              }
            },
            {
              label: '🏢 Executive',
              type: 'checkbox',
              checked: store.get('theme', 'simcity') === 'executive',
              click: async () => {
                const result = await switchTheme('executive');
                if (!result.success) {
                  showError('Theme Error', result.error);
                }
              }
            },
            {
              label: '🎮 GameBoy',
              type: 'checkbox',
              checked: store.get('theme', 'simcity') === 'gameboy',
              click: async () => {
                const result = await switchTheme('gameboy');
                if (!result.success) {
                  showError('Theme Error', result.error);
                }
              }
            },
            {
              label: '🎮 GameBoy Color',
              type: 'checkbox',
              checked: store.get('theme', 'simcity') === 'gameboy-color',
              click: async () => {
                const result = await switchTheme('gameboy-color');
                if (!result.success) {
                  showError('Theme Error', result.error);
                }
              }
            },
            {
              label: '🏠 Sims',
              type: 'checkbox',
              checked: store.get('theme', 'simcity') === 'sims',
              click: async () => {
                const result = await switchTheme('sims');
                if (!result.success) {
                  showError('Theme Error', result.error);
                }
              }
            }
          ]
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'SpawnKit Website',
          click: () => shell.openExternal('https://spawnkit.ai')
        },
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.spawnkit.ai')
        },
        { type: 'separator' },
        {
          label: 'Report Issue…',
          click: () => shell.openExternal('https://github.com/apocys/spawnkit-v2/issues')
        },
        ...(!isMac ? [
          { type: 'separator' },
          {
            label: 'About SpawnKit',
            click: () => {
              dialog.showMessageBox(mainWindow || BrowserWindow.getFocusedWindow(), {
                type: 'info',
                title: 'About SpawnKit',
                message: `SpawnKit v${app.getVersion()}`,
                detail: 'Your AI executive team, on your desktop.\n\n© 2025-2026 SpawnKit Team\nhttps://spawnkit.ai',
                buttons: ['OK']
              });
            }
          }
        ] : [])
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// --- Tray ---
function createTray() {
  const iconPath = getIconPath();
  if (!iconPath) return;

  try {
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show SpawnKit',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: `SpawnKit v${app.getVersion()}`,
        enabled: false
      },
      { type: 'separator' },
      { label: 'Quit SpawnKit', role: 'quit' }
    ]);

    tray.setToolTip('SpawnKit');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (_) {
    // Tray icon is non-critical; silently skip
  }
}

// --- IPC Handlers ---

// Setup
ipcMain.handle('detect-workspace', () => {
  const defaultPath = path.join(os.homedir(), '.openclaw', 'workspace');
  const exists = fs.existsSync(defaultPath);
  return { path: defaultPath, exists };
});

ipcMain.handle('detect-openclaw-config', () => {
  // Try to detect OpenClaw configuration
  const configPaths = [
    path.join(os.homedir(), '.openclaw', 'openclaw.json'),
    path.join(os.homedir(), '.openclaw', 'config.json'),
  ];
  for (const p of configPaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const config = JSON.parse(raw);
        // Extract relevant info (provider, model) without leaking secrets
        return {
          found: true,
          path: p,
          hasProvider: !!(config.models?.providers),
          defaultModel: config.agents?.defaults?.model?.primary || null,
        };
      } catch { return { found: true, path: p, parseError: true }; }
    }
  }
  return { found: false };
});

ipcMain.handle('test-connection', async (_event, provider, apiKey) => {
  // Validate API key format
  await new Promise(resolve => setTimeout(resolve, 600));
  if (!apiKey || apiKey.length < 10) return false;
  if (apiKey.startsWith('sk-ant-')) return true;
  if (apiKey.startsWith('sk-')) return true;
  if (apiKey.length > 20) return true;
  return false;
});

ipcMain.handle('save-config', async (_event, config) => {
  try {
    if (config) {
      Object.keys(config).forEach(k => store.set(k, config[k]));
    }
    return true;
  } catch (e) {
    showError('Config Error', `Failed to save configuration: ${e.message}`);
    return false;
  }
});

ipcMain.handle('complete-setup', async (_event, config) => {
  try {
    if (config) {
      Object.keys(config).forEach(k => store.set(k, config[k]));
    }
    store.set('setupComplete', true);

    if (setupWindow) {
      setupWindow.close();
    }
    createMainWindow();
    createMenu();
    createTray();
    return true;
  } catch (e) {
    showError('Setup Error', `Failed to complete setup: ${e.message}`);
    return false;
  }
});

// Legacy handler for old setup flow
ipcMain.handle('finish-setup', () => {
  store.set('setupComplete', true);
  if (setupWindow) {
    setupWindow.close();
  }
  createMainWindow();
  createMenu();
  createTray();
});

// Version
ipcMain.handle('get-version', () => app.getVersion());

// Window controls
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Directory browser
ipcMain.handle('browse-directory', async () => {
  const win = mainWindow || setupWindow;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    defaultPath: os.homedir()
  });
  return result.canceled ? null : result.filePaths[0];
});

// Legacy handler
ipcMain.handle('get-default-workspace', () => {
  return path.join(os.homedir(), '.openclaw', 'workspace');
});

// Theme switching
ipcMain.handle('switch-theme', async (_event, newTheme) => {
  try {
    // Validate theme exists
    const themePath = resolveThemePath(newTheme);
    if (!themePath) {
      return { success: false, error: `Theme "${newTheme}" not found` };
    }

    // Save new theme
    store.set('theme', newTheme);

    // Reload window with new theme
    if (mainWindow) {
      mainWindow.loadFile(themePath);
      // Recreate menu to update checkmarks
      createMenu();
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-current-theme', () => {
  return store.get('theme', 'simcity');
});

// Settings window
ipcMain.handle('open-settings', () => {
  createSettingsWindow();
});

// Agent Builder window
ipcMain.handle('open-agent-builder', () => {
  createAgentBuilderWindow();
});

// Open external links
ipcMain.handle('open-external', (_, url) => {
  shell.openExternal(url);
});

// --- SpawnKit Data Provider integration ---
try {
  const { registerIPC } = require('./data-provider.js');
  registerIPC(ipcMain);
} catch (err) {
  console.warn('[SpawnKit] Data provider failed to load:', err.message);
  // Graceful fallback if data-provider is unavailable
  ipcMain.handle('spawnkit:isAvailable', () => false);
  ipcMain.handle('spawnkit:getSessions', () => ({ agents: [], subagents: [], events: [] }));
  ipcMain.handle('spawnkit:getCrons', () => []);
  ipcMain.handle('spawnkit:getMemory', () => ({ longTerm: null, daily: [], heartbeat: null }));
  ipcMain.handle('spawnkit:getAgentInfo', () => null);
  ipcMain.handle('spawnkit:getMetrics', () => ({}));
  ipcMain.handle('spawnkit:getAll', () => ({ agents: [], subagents: [], crons: [], metrics: {}, meta: { mode: 'fallback' } }));
  ipcMain.handle('spawnkit:invalidateCache', () => true);
  ipcMain.handle('spawnkit:getTranscript', () => []);
  ipcMain.handle('spawnkit:sendMission', () => ({ success: false, error: 'Data provider not loaded' }));
}

// --- App Lifecycle ---

app.whenReady().then(() => {
  setCSPHeaders();

  if (!isSetupComplete()) {
    createSetupWindow();
  } else {
    createMainWindow();
    createMenu();
    createTray();
  }
});

// Second instance: focus existing window + handle deep link
app.on('second-instance', (_event, argv) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }

  // Handle deep link on Windows/Linux
  const deepLink = argv.find(arg => arg.startsWith('spawnkit://'));
  if (deepLink && mainWindow) {
    mainWindow.webContents.send('deep-link', deepLink);
  }
});

// Handle deep link on macOS
app.on('open-url', (_event, url) => {
  if (mainWindow) {
    mainWindow.webContents.send('deep-link', url);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (!isSetupComplete()) {
      createSetupWindow();
    } else {
      createMainWindow();
      createMenu();
    }
  }
});

app.on('before-quit', () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// --- Global error handling ---
process.on('uncaughtException', (error) => {
  if (isDev) {
    // In dev, still log to console for debugging
    console.error('Uncaught exception:', error); // eslint-disable-line no-console
  }
  try {
    dialog.showErrorBox(
      'SpawnKit — Unexpected Error',
      `Something went wrong. Please restart SpawnKit.\n\n${error.message}`
    );
  } catch (_) {
    // Dialog might fail if app is shutting down
  }
});

process.on('unhandledRejection', (reason) => {
  if (isDev) {
    console.error('Unhandled rejection:', reason); // eslint-disable-line no-console
  }
});
