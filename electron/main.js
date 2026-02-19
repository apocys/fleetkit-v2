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
    name: 'fleetkit-config',
    defaults: {
      setupComplete: false,
      theme: 'gameboy',
      windowBounds: { width: 1400, height: 900 },
      windowPosition: null,
      workspace: path.join(os.homedir(), '.openclaw', 'workspace')
    }
  });
} catch (_) {
  // Fallback in-memory store if electron-store fails
  const _data = {
    setupComplete: false,
    theme: 'gameboy',
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
    app.setAsDefaultProtocolClient('fleetkit', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('fleetkit');
}

// --- About panel ---
app.setAboutPanelOptions({
  applicationName: 'FleetKit',
  applicationVersion: app.getVersion(),
  version: '2.0.0',
  copyright: '© 2025-2026 FleetKit Team',
  website: 'https://fleetkit.dev',
  credits: 'Your AI team, visualized.'
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
    path.join(__dirname, '..', 'src', 'theme-selector.html'),
    path.join(__dirname, '..', `office-${theme}`, 'index.html'),
    path.join(__dirname, '..', 'office-gameboy', 'index.html'),
    path.join(__dirname, 'renderer', 'index.html')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
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
    title: 'FleetKit',
    backgroundColor: '#0f0f23'
  };

  if (savedPosition) {
    windowOpts.x = savedPosition.x;
    windowOpts.y = savedPosition.y;
  }

  mainWindow = new BrowserWindow(windowOpts);

  // Load appropriate theme
  const savedTheme = store.get('theme', 'gameboy');
  const themePath = resolveThemePath(savedTheme);

  if (themePath) {
    mainWindow.loadFile(themePath);
  } else {
    mainWindow.loadURL(`data:text/html,<html><body style="background:#0f0f23;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui"><div style="text-align:center"><h1>FleetKit</h1><p>No theme files found. Please reinstall.</p></div></body></html>`);
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
              message: 'FleetKit is up to date.',
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
            if (mainWindow) {
              mainWindow.webContents.send('open-preferences');
            }
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
          label: 'Settings',
          accelerator: isMac ? undefined : 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-preferences');
            }
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
          label: 'FleetKit Website',
          click: () => shell.openExternal('https://fleetkit.dev')
        },
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.fleetkit.dev')
        },
        { type: 'separator' },
        {
          label: 'Report Issue…',
          click: () => shell.openExternal('https://github.com/fleetkit/fleetkit/issues')
        },
        ...(!isMac ? [
          { type: 'separator' },
          {
            label: 'About FleetKit',
            click: () => {
              dialog.showMessageBox(mainWindow || BrowserWindow.getFocusedWindow(), {
                type: 'info',
                title: 'About FleetKit',
                message: `FleetKit v${app.getVersion()}`,
                detail: 'Your AI team, visualized.\nPokémon-style virtual office for AI agents.\n\n© 2025-2026 FleetKit Team\nhttps://fleetkit.dev',
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
        label: 'Show FleetKit',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: `FleetKit v${app.getVersion()}`,
        enabled: false
      },
      { type: 'separator' },
      { label: 'Quit FleetKit', role: 'quit' }
    ]);

    tray.setToolTip('FleetKit');
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

// --- FleetKit Data Provider integration ---
try {
  const { registerIPC } = require('./data-provider.js');
  registerIPC(ipcMain);
} catch (err) {
  console.warn('[FleetKit] Data provider failed to load:', err.message);
  // Graceful fallback if data-provider is unavailable
  ipcMain.handle('fleetkit:isAvailable', () => false);
  ipcMain.handle('fleetkit:getSessions', () => ({ agents: [], subagents: [], events: [] }));
  ipcMain.handle('fleetkit:getCrons', () => []);
  ipcMain.handle('fleetkit:getMemory', () => ({ longTerm: null, daily: [], heartbeat: null }));
  ipcMain.handle('fleetkit:getAgentInfo', () => null);
  ipcMain.handle('fleetkit:getMetrics', () => ({}));
  ipcMain.handle('fleetkit:getAll', () => ({ agents: [], subagents: [], crons: [], metrics: {}, meta: { mode: 'fallback' } }));
  ipcMain.handle('fleetkit:invalidateCache', () => true);
  ipcMain.handle('fleetkit:getTranscript', () => []);
  ipcMain.handle('fleetkit:sendMission', () => ({ success: false, error: 'Data provider not loaded' }));
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
  const deepLink = argv.find(arg => arg.startsWith('fleetkit://'));
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
      'FleetKit — Unexpected Error',
      `Something went wrong. Please restart FleetKit.\n\n${error.message}`
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
