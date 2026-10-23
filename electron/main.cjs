const { app, BrowserWindow, session, ipcMain, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// ==========================================
// Ultra-Low Latency Chromium Audio Switches
// ==========================================
// 1. Force the lowest possible audio buffer size (128 samples ~= 2.6ms at 48kHz)
app.commandLine.appendSwitch('audio-buffer-size', '128');

// 2. Prevent Chromium from throttling audio timers or lowering audio priority when unfocused
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

// 3. Bypass extra output buffering in the Web Audio pipeline
app.commandLine.appendSwitch('enable-features', 'WebAudioBypassOutputBuffering');

// 4. Autoplay policy - allows instant karaoke playback without user gesture prompts
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// 5. Ensure high-performance rendering for 60fps VU meters and visualizer
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');

let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = process.env.PORT || 3130;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// Helper: Check if local server is already running
function checkServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.abort();
      resolve(false);
    });
  });
}

// Helper: Wait until server becomes responsive
async function waitForServer(port, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const isUp = await checkServerRunning(port);
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

// Start local Express/Socket.io backend if not already started
async function ensureServerRunning() {
  const isRunning = await checkServerRunning(SERVER_PORT);
  if (isRunning) {
    console.log(`[Pampo Desktop] Server is already running on ${SERVER_URL}`);
    return;
  }

  console.log(`[Pampo Desktop] Starting embedded backend on ${SERVER_URL}...`);
  const serverScript = path.join(__dirname, '..', 'server.js');
  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(SERVER_PORT) },
    stdio: 'inherit',
  });

  serverProcess.on('error', (err) => {
    console.error('[Pampo Desktop] Failed to start server:', err);
  });

  const ready = await waitForServer(SERVER_PORT);
  if (ready) {
    console.log(`[Pampo Desktop] Embedded backend is ready.`);
  } else {
    console.warn(`[Pampo Desktop] Server timed out, opening directly.`);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 868,
    minWidth: 960,
    minHeight: 620,
    title: 'Pampo Karaokê - Edição Estúdio Desktop',
    backgroundColor: '#0c0e14',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false, // Audio keeps running at full speed in background
    },
  });

  // Auto-grant all audio and media permissions without showing browser prompts
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    if (['media', 'microphone', 'audioCapture', 'notifications', 'fullscreen'].includes(permission)) {
      return true;
    }
    return true;
  });

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  // Load target URL (Dev server, local server, or production)
  const targetUrl = process.env.VITE_DEV_SERVER_URL || SERVER_URL;
  mainWindow.loadURL(targetUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Custom App Menu with quick shortcuts
  const template = [
    {
      label: 'Exibir',
      submenu: [
        {
          label: 'Alternar Tela Cheia',
          accelerator: 'F11',
          click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()),
        },
        {
          label: 'Recarregar',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.reload(),
        },
        {
          label: 'Ferramentas do Desenvolvedor',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

app.whenReady().then(async () => {
  await ensureServerRunning();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {}
  }
});
