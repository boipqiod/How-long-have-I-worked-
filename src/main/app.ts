/**
 * Main application class for How long have I worked?
 */

import { app, BrowserWindow, ipcMain, Notification } from "electron";
import * as path from "path";
import { APP_CONFIG } from "../shared/constants";
import { AppSettings, AppState, MenuAction } from "../shared/types";
import { SettingsManager } from "./store";
import { TrayManager } from "./tray";
import { WorkSessionManager } from "./workSession";

export class WorkTimeTrackerApp {
  private sessionManager: WorkSessionManager;
  private trayManager: TrayManager;
  private settingsManager: SettingsManager;
  private settingsWindow: BrowserWindow | null = null;
  private updateTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionManager = new WorkSessionManager();
    this.trayManager = new TrayManager(this.sessionManager);
    this.settingsManager = new SettingsManager();
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      // Check if tray already exists to prevent duplicates
      if (this.trayManager.getTray()) {
        console.log("App already initialized");
        return;
      }

      // Create system tray
      this.trayManager.createTray();

      // Set up event listeners
      this.setupEventListeners();

      // Start update timer
      this.startUpdateTimer();

      // Restore previous session if exists
      await this.restorePreviousSession();

      // Auto-start if enabled
      await this.handleAutoStart();

      console.log("How long have I worked? initialized successfully");
    } catch (error) {
      console.error("Failed to initialize app:", error);
    }
  }

  /**
   * Set up all event listeners
   */
  private setupEventListeners(): void {
    // Tray menu actions
    this.trayManager.setupEventListeners((action: MenuAction) => {
      this.handleMenuAction(action);
    });

    // IPC handlers for settings window
    this.setupIPCHandlers();

    // App event handlers
    app.on("before-quit", () => {
      this.cleanup();
    });
  }

  /**
   * Set up IPC handlers for communication with renderer process
   */
  private setupIPCHandlers(): void {
    // Remove existing handlers to prevent duplicate registration
    ipcMain.removeHandler("get-settings");
    ipcMain.removeHandler("save-settings");
    ipcMain.removeHandler("get-session-info");
    ipcMain.removeAllListeners("close-settings-window");

    ipcMain.handle("get-settings", () => {
      return this.settingsManager.getSettings();
    });

    ipcMain.handle("save-settings", (_, settings: Partial<AppSettings>) => {
      const errors = this.settingsManager.validateSettings(settings);
      if (errors.length > 0) {
        throw new Error(errors.join(", "));
      }

      this.settingsManager.updateSettings(settings);
      this.updateTray();
      return true;
    });

    ipcMain.handle("get-session-info", () => {
      const session = this.sessionManager.getCurrentSession();
      if (!session) return null;

      return {
        state: this.sessionManager.getState(),
        elapsed: this.sessionManager.getElapsedTime(),
        remaining: this.sessionManager.getRemainingTime(),
        session,
      };
    });

    ipcMain.on("close-settings-window", () => {
      if (this.settingsWindow) {
        this.settingsWindow.close();
      }
    });
  }

  /**
   * Handle menu actions from tray
   */
  private async handleMenuAction(action: MenuAction): Promise<void> {
    try {
      switch (action.type) {
        case "start":
          await this.startWork();
          break;

        case "pause":
          this.pauseWork();
          break;

        case "resume":
          this.resumeWork();
          break;

        case "stop":
          this.stopWork();
          break;

        case "settings":
          this.openSettings();
          break;

        case "toggle-display":
          this.toggleDisplayMode(action.payload?.displayMode);
          break;

        case "quit":
          app.quit();
          break;

        default:
          console.warn("Unknown menu action:", action);
      }
    } catch (error) {
      console.error("Error handling menu action:", error);
      this.showNotification(
        "Error",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }

  /**
   * Start work session
   */
  private async startWork(): Promise<void> {
    const settings = this.settingsManager.getSettings();

    this.sessionManager.start({
      workMode: settings.workMode,
      totalHours: settings.totalHours,
      endTime: settings.endTime,
    });

    // Save session to storage
    const session = this.sessionManager.getCurrentSession();
    if (session) {
      this.settingsManager.saveCurrentSession(session);
    }

    this.updateTray();
    this.showNotification("Work Started", "Your work session has begun!");
  }

  /**
   * Pause work session
   */
  private pauseWork(): void {
    this.sessionManager.pause();

    // Save updated session
    const session = this.sessionManager.getCurrentSession();
    if (session) {
      this.settingsManager.saveCurrentSession(session);
    }

    this.updateTray();
    this.showNotification("Work Paused", "Your work session is now paused.");
  }

  /**
   * Resume work session
   */
  private resumeWork(): void {
    this.sessionManager.resume();

    // Save updated session
    const session = this.sessionManager.getCurrentSession();
    if (session) {
      this.settingsManager.saveCurrentSession(session);
    }

    this.updateTray();
    this.showNotification("Work Resumed", "Your work session has resumed.");
  }

  /**
   * Stop work session
   */
  private stopWork(): void {
    const completedSession = this.sessionManager.stop();

    // Clear session from storage
    this.settingsManager.clearCurrentSession();

    this.updateTray();

    if (completedSession) {
      const elapsed =
        Date.now() -
        completedSession.startTime.getTime() -
        completedSession.pausedDuration;
      const hours = Math.floor(elapsed / (1000 * 60 * 60));
      const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

      this.showNotification(
        "Work Session Completed",
        `You worked for ${hours}h ${minutes}m today!`
      );
    }
  }

  /**
   * Toggle display mode between remaining and elapsed time
   */
  private toggleDisplayMode(newMode?: string): void {
    const currentSettings = this.settingsManager.getSettings();
    const displayMode =
      newMode ||
      (currentSettings.displayMode === "remaining" ? "elapsed" : "remaining");

    this.settingsManager.setSetting(
      "displayMode",
      displayMode as "remaining" | "elapsed"
    );
    this.updateTray();

    // Show notification about the change
    this.showNotification(
      "Display Mode Changed",
      `Now showing ${
        displayMode === "remaining" ? "remaining" : "elapsed"
      } time`
    );
  }

  /**
   * Open settings window
   */
  private openSettings(): void {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 450,
      height: 500,
      resizable: false,
      title: "How long have I worked? - Settings",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "../renderer/preload.js"),
      },
    });

    // Load settings page
    this.settingsWindow.loadFile(
      path.join(__dirname, "../renderer/index.html")
    );

    // Handle window close
    this.settingsWindow.on("closed", () => {
      this.settingsWindow = null;
    });
  }

  /**
   * Update tray display
   */
  private updateTray(): void {
    const state = this.sessionManager.getState();
    const settings = this.settingsManager.getSettings();
    this.trayManager.updateTray(state, settings);
  }

  /**
   * Start the update timer for tray refreshes
   */
  private startUpdateTimer(): void {
    this.updateTimer = setInterval(() => {
      const state = this.sessionManager.getState();

      // Update tray if session is running
      if (state === "running") {
        this.updateTray();

        // Check if work is completed
        if (this.sessionManager.isCompleted()) {
          this.stopWork();
          this.showNotification(
            "Work Completed!",
            "Your work day is finished!"
          );
        }
      }
    }, APP_CONFIG.trayUpdateInterval);
  }

  /**
   * Stop the update timer
   */
  private stopUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Restore previous session if exists
   */
  private async restorePreviousSession(): Promise<void> {
    if (this.settingsManager.hasActiveSession()) {
      const savedSession = this.settingsManager.getCurrentSession();
      if (savedSession) {
        this.sessionManager.restoreSession(savedSession);
        this.updateTray();

        this.showNotification(
          "Session Restored",
          "Your previous work session has been restored."
        );
      }
    }
  }

  /**
   * Handle auto-start functionality
   */
  private async handleAutoStart(): Promise<void> {
    const settings = this.settingsManager.getSettings();

    if (
      settings.autoStartOnLaunch &&
      !this.sessionManager.getCurrentSession()
    ) {
      // Small delay to ensure everything is initialized
      setTimeout(() => {
        this.startWork();
      }, 1000);
    }
  }

  /**
   * Show system notification
   */
  private showNotification(title: string, body: string): void {
    if (Notification.isSupported()) {
      new Notification({
        title,
        body,
        icon: path.join(__dirname, "../assets/icon.png"),
      }).show();
    }
  }

  /**
   * Cleanup resources before app exit
   */
  cleanup(): void {
    // Save current session if exists
    const session = this.sessionManager.getCurrentSession();
    if (session) {
      this.settingsManager.saveCurrentSession(session);
    }

    // Stop timers
    this.stopUpdateTimer();

    // Destroy tray
    this.trayManager.destroy();

    // Close settings window
    if (this.settingsWindow) {
      this.settingsWindow.destroy();
    }
  }

  /**
   * Get current application state
   */
  getState(): AppState {
    return this.sessionManager.getState();
  }

  /**
   * Get settings manager
   */
  getSettingsManager(): SettingsManager {
    return this.settingsManager;
  }

  /**
   * Get session manager
   */
  getSessionManager(): WorkSessionManager {
    return this.sessionManager;
  }
}
