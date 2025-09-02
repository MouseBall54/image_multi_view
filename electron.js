import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
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

// IPC handler for input dialog
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
      // 확인을 클릭한 경우, 기본값 반환 (실제 input은 추후 구현)
      return { success: true, value: placeholder || '' };
    }
    
    return { success: false, value: null };
  } catch (error) {
    console.error('Error showing input dialog:', error);
    return { success: false, value: null };
  }
});

// IPC handler for saving images
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
      // Remove data URL prefix if present
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
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, try to load from dist folder relative to electron.js
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
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
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

// Set up application menu (optional)
const template = [
  {
    label: 'File',
    submenu: [
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
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);