/**
 * System tray management for How long have I worked?
 */

import { Menu, nativeImage, Tray } from "electron";
import * as path from "path";
import { TRAY_STATES } from "../shared/constants";
import { AppSettings, AppState, MenuAction } from "../shared/types";
import { WorkSessionManager } from "./workSession";

export class TrayManager {
  private tray: Tray | null = null;
  private sessionManager: WorkSessionManager;
  private onMenuAction: ((action: MenuAction) => void) | null = null;
  private currentDisplayMode: "remaining" | "elapsed" = "remaining";
  private use24HourFormat: boolean = true;

  constructor(sessionManager: WorkSessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Create and initialize the system tray
   */
  createTray(): Tray {
    // Create tray icon (using default icon for now)
    const icon = this.createTrayIcon();
    this.tray = new Tray(icon);

    // Set initial state
    this.updateTray("idle", null);

    return this.tray;
  }

  /**
   * Update tray appearance and menu based on current state
   */
  updateTray(state: AppState, settings: AppSettings | null): void {
    if (!this.tray) return;

    // Update current display mode and time format from settings
    if (settings) {
      this.currentDisplayMode = settings.displayMode;
      this.use24HourFormat = settings.use24HourFormat;
    }

    // Update tray title and tooltip
    this.updateTrayDisplay(state);

    // Update context menu
    this.updateTrayMenu(state, settings);
  }

  /**
   * Update tray icon and title based on session state
   */
  updateTrayDisplay(state: AppState): void {
    if (!this.tray) return;

    const session = this.sessionManager.getCurrentSession();

    switch (state) {
      case "idle":
        this.tray.setTitle(TRAY_STATES.idle.title);
        this.tray.setToolTip(TRAY_STATES.idle.tooltip);
        break;

      case "running":
        if (session && this.currentDisplayMode) {
          const timeStr = this.getFormattedTimeDisplay();
          this.tray.setTitle(TRAY_STATES.running.title + timeStr);
        }
        this.tray.setToolTip(TRAY_STATES.running.tooltip);
        break;

      case "paused":
        if (session && this.currentDisplayMode) {
          const timeStr = this.getFormattedTimeDisplay();
          this.tray.setTitle(TRAY_STATES.paused.title + timeStr);
        }
        this.tray.setToolTip(TRAY_STATES.paused.tooltip);
        break;

      case "completed":
        this.tray.setTitle(TRAY_STATES.completed.title);
        this.tray.setToolTip(TRAY_STATES.completed.tooltip);
        break;
    }
  }

  getFormattedTimeDisplay(): string {
    const displayTime =
      this.currentDisplayMode === "remaining"
        ? this.sessionManager.getRemainingTime()
        : this.sessionManager.getElapsedTime();

    return this.sessionManager.formatTimeDisplay(
      displayTime,
      "short",
      this.use24HourFormat
    );
  }

  /**
   * Update context menu based on current state
   */
  updateTrayMenu(state: AppState, settings: AppSettings | null): void {
    if (!this.tray) return;

    const menu = this.buildContextMenu(state, settings);
    this.tray.setContextMenu(menu);
  }

  /**
   * Build context menu based on current state
   */
  private buildContextMenu(
    state: AppState,
    settings: AppSettings | null
  ): Menu {
    const session = this.sessionManager.getCurrentSession();
    const menuItems: Electron.MenuItemConstructorOptions[] = [];

    // State-specific menu items
    switch (state) {
      case "idle":
        menuItems.push({
          label: "▶️ Start Work",
          click: () => this.handleMenuAction({ type: "start" }),
        });
        break;

      case "running":
        menuItems.push({
          label: "⏸️ Pause Work",
          click: () => this.handleMenuAction({ type: "pause" }),
        });
        menuItems.push({
          label: "⏹️ Stop Work",
          click: () => this.handleMenuAction({ type: "stop" }),
        });
        break;

      case "paused":
        menuItems.push({
          label: "▶️ Resume Work",
          click: () => this.handleMenuAction({ type: "resume" }),
        });
        menuItems.push({
          label: "⏹️ Stop Work",
          click: () => this.handleMenuAction({ type: "stop" }),
        });
        break;

      case "completed":
        menuItems.push({
          label: "✅ Work Completed!",
          enabled: false,
        });
        menuItems.push({
          label: "🔄 Start New Session",
          click: () => this.handleMenuAction({ type: "start" }),
        });
        break;
    }

    // Add separator if we have state-specific items
    if (menuItems.length > 0) {
      menuItems.push({ type: "separator" });
    }

    // Session info (when active)
    if (session && (state === "running" || state === "paused")) {
      const elapsed = this.sessionManager.getElapsedTime();
      const remaining = this.sessionManager.getRemainingTime();

      menuItems.push({
        label: `Started: ${session.startTime.toLocaleTimeString()}`,
        enabled: false,
      });

      if (session.settings.workMode === "endTime") {
        menuItems.push({
          label: `End Time: ${session.settings.endTime}`,
          enabled: false,
        });
      } else {
        menuItems.push({
          label: `Target: ${session.settings.totalHours} hours`,
          enabled: false,
        });
      }

      menuItems.push({
        label: `Elapsed: ${this.sessionManager.formatTimeDisplay(
          elapsed,
          "full",
          this.use24HourFormat
        )}`,
        enabled: false,
      });

      menuItems.push({
        label: `Remaining: ${this.sessionManager.formatTimeDisplay(
          remaining,
          "full",
          this.use24HourFormat
        )}`,
        enabled: false,
      });

      menuItems.push({ type: "separator" });
    }

    // Display mode toggle (when session is active)
    if (session && settings) {
      const currentMode = settings.displayMode;
      const newMode = currentMode === "remaining" ? "elapsed" : "remaining";

      menuItems.push({
        label: `Toggle to ${newMode} time`,
        click: () =>
          this.handleMenuAction({
            type: "toggle-display",
            payload: { displayMode: newMode },
          }),
      });

      menuItems.push({ type: "separator" });
    }

    // Settings and app control
    menuItems.push({
      label: "⚙️ Settings",
      click: () => this.handleMenuAction({ type: "settings" }),
    });

    menuItems.push({ type: "separator" });

    menuItems.push({
      label: "❌ Quit",
      click: () => this.handleMenuAction({ type: "quit" }),
    });

    return Menu.buildFromTemplate(menuItems);
  }

  /**
   * Handle menu action clicks
   */
  private handleMenuAction(action: MenuAction): void {
    // Call the callback directly since we can't emit custom events on Tray
    if (this.onMenuAction) {
      this.onMenuAction(action);
    }
  }

  /**
   * Set up event listeners for tray
   */
  setupEventListeners(onMenuAction: (action: MenuAction) => void): void {
    if (!this.tray) return;

    this.onMenuAction = onMenuAction;

    // Handle double-click on tray icon
    this.tray.on("double-click", () => {
      const state = this.sessionManager.getState();
      if (state === "idle" || state === "completed") {
        onMenuAction({ type: "start" });
      } else if (state === "running") {
        onMenuAction({ type: "pause" });
      } else if (state === "paused") {
        onMenuAction({ type: "resume" });
      }
    });
  }

  /**
   * Create tray icon image
   */
  private createTrayIcon(): Electron.NativeImage {
    // For now, create a simple text-based icon
    // In production, you would load an actual icon file
    const iconPath = path.join(__dirname, "../assets/icon.png");

    try {
      return nativeImage.createFromPath(iconPath);
    } catch (error) {
      // Fallback: create a simple icon from text
      return nativeImage.createFromDataURL(this.createSimpleIcon());
    }
  }

  /**
   * Create a simple icon as data URL (fallback)
   */
  private createSimpleIcon(): string {
    // Create a simple 16x16 clock icon as base64 encoded PNG
    const canvas = `
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" fill="none" stroke="black" stroke-width="1"/>
        <line x1="8" y1="8" x2="8" y2="4" stroke="black" stroke-width="1"/>
        <line x1="8" y1="8" x2="11" y2="8" stroke="black" stroke-width="1"/>
      </svg>
    `;

    return `data:image/svg+xml;base64,${Buffer.from(canvas).toString(
      "base64"
    )}`;
  }

  /**
   * Destroy the tray
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  /**
   * Get tray instance
   */
  getTray(): Tray | null {
    return this.tray;
  }
}
