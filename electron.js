import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

const readPackageJson = () => {
  try {
    const pkgPath = path.join(__dirname, 'package.json');
    const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
    return JSON.parse(pkgRaw);
  } catch (error) {
    console.error('Failed to read package.json for logging config:', error);
    return {};
  }
};

const packageJsonCache = readPackageJson();
const usageLoggingConfig = packageJsonCache.usageLogging ?? {};

const resolveBuildChannel = () => {
  const channel =
    process.env.VITE_BUILD_CHANNEL ??
    process.env.BUILD_CHANNEL ??
    (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');
  return channel === 'prod' ? 'prod' : 'dev';
};

const normalizeEndpoint = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
};

const getUsageLoggingEndpoint = () => {
  const channel = resolveBuildChannel();
  const envKey = `USAGE_LOG_ENDPOINT_${channel.toUpperCase()}`;
  const envOverride = process.env[envKey] ?? process.env.USAGE_LOG_ENDPOINT;
  if (envOverride) {
    return normalizeEndpoint(envOverride);
  }

  const configForChannel = usageLoggingConfig?.[channel]?.endpoint;
  if (configForChannel) {
    return normalizeEndpoint(configForChannel);
  }
  const defaultEndpoint = usageLoggingConfig?.default?.endpoint ?? usageLoggingConfig?.prod?.endpoint ?? usageLoggingConfig?.dev?.endpoint;
  return normalizeEndpoint(defaultEndpoint);
};

const postUsageLog = async (payload) => {
  const endpoint = getUsageLoggingEndpoint();
  if (!endpoint) {
    return { success: false, error: 'Usage logging endpoint is not configured' };
  }
  if (typeof fetch !== 'function') {
    return { success: false, error: 'Fetch API not available in Electron main process' };
  }
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error('Failed to send usage log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send usage log'
    };
  }
};

const logUsageEvent = async (eventType, details = {}, clientContext = {}) => {
  const payload = {
    eventType: eventType || 'custom',
    timestamp: new Date().toISOString(),
    appVersion: app.getVersion(),
    channel: resolveBuildChannel(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    node: process.version,
    details,
    clientContext
  };
  return postUsageLog(payload);
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let mainWindow;

// Configure electron-updater
autoUpdater.checkForUpdatesAndNotify = false; // We'll handle notifications manually
autoUpdater.autoDownload = false; // We'll control when to download
autoUpdater.autoInstallOnAppQuit = true; // Install on app quit

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
  sendToRenderer('update-checking');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  sendToRenderer('update-available', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes: info.releaseNotes,
    files: info.files
  });
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
  sendToRenderer('update-not-available');
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  sendToRenderer('update-error', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  const { bytesPerSecond, percent, transferred, total } = progressObj;
  console.log(`Download progress: ${percent.toFixed(2)}%`);
  sendToRenderer('update-download-progress', {
    percent: Math.round(percent),
    transferred,
    total,
    bytesPerSecond
  });
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  sendToRenderer('update-downloaded', {
    version: info.version,
    releaseDate: info.releaseDate
  });
});

// Helper function to send messages to renderer
function sendToRenderer(channel, data) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(channel, data);
  }
}

// Auto-updater IPC handlers
ipcMain.handle('updater-check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    console.error('Check for updates failed:', error);
    return { error: error.message };
  }
});

ipcMain.handle('updater-download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('Download update failed:', error);
    return { error: error.message };
  }
});

ipcMain.handle('updater-quit-and-install', async () => {
  try {
    // Show confirmation dialog
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      title: 'compareX Update',
      message: 'An update is ready to install.',
      detail: 'Would you like to restart now to complete the update?'
    });

    if (response === 0) {
      setImmediate(() => autoUpdater.quitAndInstall());
      return { success: true, action: 'restart' };
    } else {
      return { success: true, action: 'later' };
    }
  } catch (error) {
    console.error('Quit and install failed:', error);
    return { error: error.message };
  }
});

ipcMain.handle('updater-get-version', async () => {
  return {
    current: app.getVersion(),
    isDev: isDev
  };
});

ipcMain.handle('updater-set-feed-url', async (event, feedUrl) => {
  try {
    autoUpdater.setFeedURL(feedUrl);
    return { success: true };
  } catch (error) {
    console.error('Set feed URL failed:', error);
    return { error: error.message };
  }
});

// Legacy IPC handlers for compatibility
ipcMain.handle('show-input-dialog', async (event, title, placeholder) => {
  try {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['확인', '취소'],
      defaultId: 0,
      title: title || '입력',
      message: title || '파일명을 입력하세요',
      detail: `기본값: ${placeholder || ''}`,
    });
    
    if (response === 0) {
      return { success: true, value: placeholder || '' };
    }
    
    return { success: false, value: null };
  } catch (error) {
    console.error('Error showing input dialog:', error);
    return { success: false, value: null };
  }
});

ipcMain.handle('save-image', async (event, imageData, defaultFileName) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultFileName,
      filters: [
        { name: 'PNG Images', extensions: ['png'] },
        { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!canceled && filePath) {
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      await fs.promises.writeFile(filePath, buffer);
      
      return { 
        success: true, 
        path: filePath,
        message: 'File saved successfully!' 
      };
    }
    
    return { success: false, message: 'Save operation was canceled' };
  } catch (error) {
    console.error('Error saving file:', error);
    return { 
      success: false, 
      message: 'Failed to save file: ' + error.message 
    };
  }
});

ipcMain.handle('log-usage-event', async (_event, payload = {}) => {
  try {
    const { eventType, details, context } = payload;
    return await logUsageEvent(eventType, details, context);
  } catch (error) {
    console.error('Failed to record usage event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown logging error'
    };
  }
});

ipcMain.handle('open-tutorial-asset', async (_event, target) => {
  try {
    if (typeof target !== 'string' || target.length === 0) {
      throw new Error('Invalid tutorial asset path');
    }

    const openWithPreferredApps = async (resource, { isUrl }) => {
      const platform = process.platform;

      const spawnApp = (command, args) => {
        return new Promise((resolve) => {
          try {
            const child = spawn(command, args, { stdio: 'ignore' });
            let settled = false;
            const settle = (value) => {
              if (!settled) {
                settled = true;
                resolve(value);
              }
            };
            child.on('error', () => settle(false));
            child.on('exit', (code) => settle(code === 0));
            // If process keeps running, assume success.
            setTimeout(() => settle(true), 250);
            child.unref();
          } catch (_error) {
            resolve(false);
          }
        });
      };

      const tryWindowsApps = async () => {
        const env = process.env;
        const candidates = [
          env['PROGRAMFILES'] ? path.join(env['PROGRAMFILES'], 'Microsoft', 'Edge', 'Application', 'msedge.exe') : null,
          env['PROGRAMFILES(X86)'] ? path.join(env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe') : null,
          env['LOCALAPPDATA'] ? path.join(env['LOCALAPPDATA'], 'Microsoft', 'Edge', 'Application', 'msedge.exe') : null
        ].filter(Boolean);
        for (const candidate of candidates) {
          if (fs.existsSync(candidate) && await spawnApp(candidate, [resource])) {
            return true;
          }
        }
        if (await spawnApp('msedge.exe', [resource])) {
          return true;
        }

        const chromeCandidates = [
          env['PROGRAMFILES'] ? path.join(env['PROGRAMFILES'], 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
          env['PROGRAMFILES(X86)'] ? path.join(env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
          env['LOCALAPPDATA'] ? path.join(env['LOCALAPPDATA'], 'Google', 'Chrome', 'Application', 'chrome.exe') : null
        ].filter(Boolean);
        for (const candidate of chromeCandidates) {
          if (fs.existsSync(candidate) && await spawnApp(candidate, [resource])) {
            return true;
          }
        }
        if (await spawnApp('chrome.exe', [resource])) {
          return true;
        }
        return false;
      };

      const tryMacApps = async () => {
        if (await spawnApp('open', ['-a', 'Microsoft Edge', resource])) {
          return true;
        }
        if (await spawnApp('open', ['-a', 'Google Chrome', resource])) {
          return true;
        }
        return false;
      };

      const tryLinuxApps = async () => {
        const edgeCommands = ['microsoft-edge', 'microsoft-edge-stable', 'msedge'];
        for (const cmd of edgeCommands) {
          if (await spawnApp(cmd, [resource])) {
            return true;
          }
        }
        const chromeCommands = ['google-chrome', 'google-chrome-stable', 'chromium-browser', 'chromium'];
        for (const cmd of chromeCommands) {
          if (await spawnApp(cmd, [resource])) {
            return true;
          }
        }
        return false;
      };

      if (platform === 'win32') {
        return await tryWindowsApps();
      }
      if (platform === 'darwin') {
        return await tryMacApps();
      }
      if (platform === 'linux') {
        return await tryLinuxApps();
      }

      // Fallback for unknown platforms
      if (isUrl) {
        await shell.openExternal(resource);
      } else {
        await shell.openPath(resource);
      }
      return true;
    };

    if (/^https?:/i.test(target)) {
      const launched = await openWithPreferredApps(target, { isUrl: true });
      if (!launched) {
        await shell.openExternal(target);
      }
      return { success: true };
    }

    const openLocalAsset = async (absolutePath) => {
      const buffer = await fs.promises.readFile(absolutePath);
      const baseName = path.basename(absolutePath);
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tempPath = path.join(app.getPath('temp'), `comparex-tutorial-${uniqueSuffix}-${baseName}`);
      await fs.promises.writeFile(tempPath, buffer);
      const launched = await openWithPreferredApps(tempPath, { isUrl: false });
      if (!launched) {
        const openResult = await shell.openPath(tempPath);
        if (openResult) {
          throw new Error(openResult);
        }
      }
    };

    if (/^file:/i.test(target)) {
      const fileUrl = new URL(target);
      const filePath = fileURLToPath(fileUrl);
      await openLocalAsset(filePath);
      return { success: true };
    }

    const normalized = target.replace(/^app:\/\//i, '').replace(/^\/+/, '');
    const absolutePath = path.join(__dirname, 'dist', normalized);
    await openLocalAsset(absolutePath);
    return { success: true };
  } catch (error) {
    console.error('Failed to open tutorial asset:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('window-reload', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.reload();
    return { success: true };
  }
  return { success: false, error: 'Main window not available' };
});

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1800,
    height: 1200,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow file:// protocol for local images
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false, // Don't show until ready
    autoHideMenuBar: true,
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    const distPath = path.join(__dirname, 'dist', 'index.html');
    console.log('Loading from:', distPath);
    mainWindow.loadFile(distPath).catch(error => {
      console.error('Failed to load file:', error);
    });
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window minimize/restore for update notifications
  mainWindow.on('minimize', () => {
    if (process.platform === 'win32') {
      // Continue update checks even when minimized
    }
  });

  // Hide OS native menu bar to use custom themed menu
  mainWindow.setMenuBarVisibility(false);
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  void logUsageEvent('app_ready', {
    isDevBuild: isDev,
    channel: resolveBuildChannel()
  });
  // Renderer manages update checks (schedules + UI). Avoid double checks here.
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app quit for updates
app.on('before-quit', (event) => {
  if (autoUpdater.downloadedVersion) {
    console.log('Update will be installed on quit');
  }
});

// Set up application menu
// Keep a minimal template for macOS role integration, but hide on Windows/Linux
const fileSubmenu = [];

if (isDev) {
  fileSubmenu.push({
    label: 'Check for Updates...',
    click: async () => {
      try {
        await autoUpdater.checkForUpdates();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Manual update check failed:', error);
        sendToRenderer('update-error', message);
      }
    }
  });
  fileSubmenu.push({ type: 'separator' });
}

fileSubmenu.push({
  label: 'Exit',
  accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
  click: () => {
    app.quit();
  }
});

const viewSubmenu = [
  { role: 'reload' },
  { role: 'forceReload' },
];

if (isDev) {
  viewSubmenu.push({ role: 'toggleDevTools' });
}

viewSubmenu.push(
  { type: 'separator' },
  { role: 'actualSize' },
  { role: 'zoomIn' },
  { role: 'zoomOut' },
  { type: 'separator' },
  { role: 'togglefullscreen' }
);

const template = [
  {
    label: 'File',
    submenu: fileSubmenu
  },
  {
    label: 'View',
    submenu: viewSubmenu
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'About compareX',
        click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'About compareX',
            message: `compareX v${app.getVersion()}`,
            detail: 'Advanced image comparison and analysis tool\n\nBuilt with Electron and React'
          });
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
// Only set app menu on macOS to keep native feel; hidden on others
if (process.platform === 'darwin') {
  Menu.setApplicationMenu(menu);
} else {
  Menu.setApplicationMenu(null);
}

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Prevent default behavior of dragging files into the window
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
});

// IPC: Window/app control for custom menu
ipcMain.handle('app-quit', () => {
  app.quit();
});

ipcMain.handle('window-toggle-devtools', () => {
  if (mainWindow && mainWindow.webContents) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
  }
});

ipcMain.handle('window-toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});
