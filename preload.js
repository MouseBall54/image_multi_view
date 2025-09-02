const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  saveImage: (imageData, fileName) => ipcRenderer.invoke('save-image', imageData, fileName),
  showInputDialog: (title, placeholder) => ipcRenderer.invoke('show-input-dialog', title, placeholder),
  isElectron: () => true,
  platform: process.platform
});