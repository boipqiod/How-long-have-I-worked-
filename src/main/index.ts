/**
 * Main process entry point for How long have I worked?
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { WorkTimeTrackerApp } from './app';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch (e) {
  // electron-squirrel-startup is not installed, which is fine for development
}

let mainApp: WorkTimeTrackerApp;

/**
 * Initialize the application when Electron is ready
 */
const createApp = (): void => {
  if (!mainApp) {
    mainApp = new WorkTimeTrackerApp();
    mainApp.initialize();
  }
};

/**
 * This method will be called when Electron has finished initialization
 * and is ready to create browser windows.
 */
app.whenReady().then(() => {
  // Hide app from dock on macOS
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }
  
  createApp();

  app.on('activate', () => {
    // On OS X, prevent re-creating the app when dock icon is clicked
    // since this is a menu bar app that should stay running
    if (!mainApp) {
      createApp();
    }
  });
});

/**
 * Don't quit when all windows are closed - this is a menu bar app
 */
app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed
  // This keeps the menu bar app running in the background
});

/**
 * Handle application termination
 */
app.on('before-quit', () => {
  if (mainApp) {
    mainApp.cleanup();
  }
});

/**
 * Security: Prevent navigation to external websites
 */
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'file://') {
      navigationEvent.preventDefault();
    }
  });
});