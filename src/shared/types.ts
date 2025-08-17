/**
 * Shared type definitions for Work Time Tracker application
 */

export interface AppSettings {
  displayMode: 'remaining' | 'elapsed';
  workMode: 'totalHours' | 'endTime';
  totalHours: number;
  endTime: string; // HH:MM format
  autoStartOnBoot: boolean;
  autoStartOnLaunch: boolean;
  use24HourFormat: boolean;
}

export interface WorkSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  pausedDuration: number; // in milliseconds
  isRunning: boolean;
  isPaused: boolean;
  settings: Pick<AppSettings, 'workMode' | 'totalHours' | 'endTime'>;
}

export interface TimeDisplay {
  hours: number;
  minutes: number;
  seconds: number;
  totalMilliseconds: number;
  isOvertime: boolean;
}

export type AppState = 'idle' | 'running' | 'paused' | 'completed';

export interface MenuAction {
  type: 'start' | 'pause' | 'resume' | 'stop' | 'settings' | 'quit' | 'toggle-display';
  payload?: any;
}