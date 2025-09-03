const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Legacy APIs
  saveImage: (imageData, fileName) => ipcRenderer.invoke('save-image', imageData, fileName),
  showInputDialog: (title, placeholder) => ipcRenderer.invoke('show-input-dialog', title, placeholder),
  isElectron: () => true,
  platform: process.platform,
  
  // New electron-updater APIs
  updater: {
    // Check for updates
    checkForUpdates: () => ipcRenderer.invoke('updater-check-for-updates'),
    
    // Download available update
    downloadUpdate: () => ipcRenderer.invoke('updater-download-update'),
    
    // Install downloaded update and restart
    quitAndInstall: () => ipcRenderer.invoke('updater-quit-and-install'),
    
    // Get current app version
    getVersion: () => ipcRenderer.invoke('updater-get-version'),
    
    // Set custom feed URL (if needed)
    setFeedURL: (feedUrl) => ipcRenderer.invoke('updater-set-feed-url', feedUrl),
    
    // Event listeners for update events
    onUpdateChecking: (callback) => {
      ipcRenderer.on('update-checking', () => callback());
    },
    
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', (event, info) => callback(info));
    },
    
    onUpdateNotAvailable: (callback) => {
      ipcRenderer.on('update-not-available', () => callback());
    },
    
    onUpdateError: (callback) => {
      ipcRenderer.on('update-error', (event, error) => callback(error));
    },
    
    onDownloadProgress: (callback) => {
      ipcRenderer.on('update-download-progress', (event, progress) => callback(progress));
    },
    
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', (event, info) => callback(info));
    },
    
    // Remove all update event listeners
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('update-checking');
      ipcRenderer.removeAllListeners('update-available');
      ipcRenderer.removeAllListeners('update-not-available');
      ipcRenderer.removeAllListeners('update-error');
      ipcRenderer.removeAllListeners('update-download-progress');
      ipcRenderer.removeAllListeners('update-downloaded');
    }
  }
});