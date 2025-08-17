/**
 * Preload script for secure IPC communication
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings operations
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Session information
  getSessionInfo: () => ipcRenderer.invoke('get-session-info'),
  
  // Close window
  closeWindow: () => ipcRenderer.send('close-settings-window'),
});