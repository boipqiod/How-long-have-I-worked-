/**
 * Settings and data persistence management for How long have I worked?
 */

import Store from 'electron-store';
import { AppSettings, WorkSession } from '../shared/types';
import { DEFAULT_SETTINGS, APP_CONFIG } from '../shared/constants';

export class SettingsManager {
  private store: any;
  private sessionStore: any;

  constructor() {
    // Initialize settings store with default values
    this.store = new Store({
      name: APP_CONFIG.storeKey,
      defaults: DEFAULT_SETTINGS,
    });

    // Initialize session store for current work session
    this.sessionStore = new Store({
      name: APP_CONFIG.sessionStoreKey,
      defaults: {},
    });
  }

  /**
   * Get all application settings
   */
  getSettings(): AppSettings {
    return {
      displayMode: this.store.get('displayMode'),
      workMode: this.store.get('workMode'),
      totalHours: this.store.get('totalHours'),
      endTime: this.store.get('endTime'),
      autoStartOnBoot: this.store.get('autoStartOnBoot'),
      autoStartOnLaunch: this.store.get('autoStartOnLaunch'),
      use24HourFormat: this.store.get('use24HourFormat'),
    };
  }

  /**
   * Update application settings
   */
  updateSettings(settings: Partial<AppSettings>): void {
    Object.entries(settings).forEach(([key, value]) => {
      this.store.set(key as keyof AppSettings, value);
    });
  }

  /**
   * Reset settings to default values
   */
  resetSettings(): void {
    this.store.clear();
  }

  /**
   * Get specific setting value
   */
  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key);
  }

  /**
   * Set specific setting value
   */
  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value);
  }

  /**
   * Save current work session
   */
  saveCurrentSession(session: WorkSession): void {
    this.sessionStore.set('currentSession', session);
  }

  /**
   * Load current work session
   */
  getCurrentSession(): WorkSession | undefined {
    return this.sessionStore.get('currentSession');
  }

  /**
   * Clear current work session
   */
  clearCurrentSession(): void {
    this.sessionStore.delete('currentSession');
  }

  /**
   * Check if there's an active session that needs to be restored
   */
  hasActiveSession(): boolean {
    const session = this.getCurrentSession();
    return session !== undefined && session.isRunning;
  }

  /**
   * Validate settings values
   */
  validateSettings(settings: Partial<AppSettings>): string[] {
    const errors: string[] = [];

    if (settings.totalHours !== undefined) {
      if (settings.totalHours < 1 || settings.totalHours > 12) {
        errors.push('Total hours must be between 1 and 12');
      }
    }

    if (settings.endTime !== undefined) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(settings.endTime)) {
        errors.push('End time must be in HH:MM format (24-hour)');
      }
    }

    return errors;
  }

  /**
   * Export settings as JSON
   */
  exportSettings(): string {
    return JSON.stringify(this.getSettings(), null, 2);
  }

  /**
   * Import settings from JSON
   */
  importSettings(jsonString: string): boolean {
    try {
      const settings = JSON.parse(jsonString) as Partial<AppSettings>;
      const errors = this.validateSettings(settings);
      
      if (errors.length > 0) {
        console.error('Settings validation failed:', errors);
        return false;
      }

      this.updateSettings(settings);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }
}