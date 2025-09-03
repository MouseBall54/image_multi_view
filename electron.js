import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

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

// Development mode: disable updater
if (isDev) {
  autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
  // Disable updater in development
  Object.defineProperty(autoUpdater, 'isUpdaterActive', {
    get() { return false; }
  });
}

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
  if (isDev) {
    return { error: 'Updates disabled in development mode' };
  }
  
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    console.error('Check for updates failed:', error);
    return { error: error.message };
  }
});

ipcMain.handle('updater-download-update', async () => {
  if (isDev) {
    return { error: 'Updates disabled in development mode' };
  }
  
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('Download update failed:', error);
    return { error: error.message };
  }
});

ipcMain.handle('updater-quit-and-install', async () => {
  if (isDev) {
    return { error: 'Updates disabled in development mode' };
  }
  
  try {
    // Show confirmation dialog
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      title: 'CompareX Update',
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
  if (isDev) {
    return { error: 'Updates disabled in development mode' };
  }
  
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

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Check for Updates...',
        enabled: !isDev,
        click: async () => {
          try {
            await autoUpdater.checkForUpdates();
          } catch (error) {
            dialog.showErrorBox('Update Check Failed', error.message);
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Exit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'actualSize' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'About CompareX',
        click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'About CompareX',
            message: `CompareX v${app.getVersion()}`,
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
