/**
 * Application constants and default values
 */

export const DEFAULT_SETTINGS = {
  displayMode: "remaining" as const,
  workMode: "totalHours" as const,
  totalHours: 9,
  endTime: "18:00",
  autoStartOnBoot: false,
  autoStartOnLaunch: false,
  use24HourFormat: true,
};

export const APP_CONFIG = {
  name: "How long have I worked?",
  trayUpdateInterval: 1000, // 1 second
  storeKey: "work-time-tracker-settings",
  sessionStoreKey: "work-time-tracker-session",
};

export const TIME_FORMATS = {
  display: "HH:mm:ss",
  short: "HH:mm",
  setting: "HH:mm",
};

export const TRAY_STATES = {
  idle: {
    title: "▶️",
    tooltip: "How long have I worked? - Click to start",
  },
  running: {
    title: "🧑🏻‍💻",
    tooltip: "How long have I worked? - Running",
  },
  paused: {
    title: "⏸️",
    tooltip: "How long have I worked? - Paused",
  },
  completed: {
    title: "✅",
    tooltip: "How long have I worked? - Work completed!",
  },
} as const;
