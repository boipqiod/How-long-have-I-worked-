/**
 * Work session management and time tracking logic
 */

import { AppSettings, TimeDisplay, WorkSession } from "../shared/types";

export class WorkSessionManager {
  private session: WorkSession | null = null;
  private timer: NodeJS.Timeout | null = null;
  private pauseStartTime: Date | null = null;

  constructor() {}

  /**
   * Start a new work session
   */
  start(
    settings: Pick<AppSettings, "workMode" | "totalHours" | "endTime">
  ): WorkSession {
    if (this.session && this.session.isRunning) {
      throw new Error("Work session is already running");
    }

    this.session = {
      id: this.generateSessionId(),
      startTime: new Date(),
      pausedDuration: 0,
      isRunning: true,
      isPaused: false,
      settings,
    };

    return this.session;
  }

  /**
   * Pause the current work session
   */
  pause(): WorkSession {
    if (!this.session || !this.session.isRunning || this.session.isPaused) {
      throw new Error("No active session to pause");
    }

    this.session.isPaused = true;
    this.pauseStartTime = new Date();

    return this.session;
  }

  /**
   * Resume the paused work session
   */
  resume(): WorkSession {
    if (!this.session || !this.session.isRunning || !this.session.isPaused) {
      throw new Error("No paused session to resume");
    }

    if (this.pauseStartTime) {
      const pauseDuration = Date.now() - this.pauseStartTime.getTime();
      this.session.pausedDuration += pauseDuration;
      this.pauseStartTime = null;
    }

    this.session.isPaused = false;

    return this.session;
  }

  /**
   * Stop the current work session
   */
  stop(): WorkSession | null {
    if (!this.session) {
      return null;
    }

    // If paused, add the final pause duration
    if (this.session.isPaused && this.pauseStartTime) {
      const pauseDuration = Date.now() - this.pauseStartTime.getTime();
      this.session.pausedDuration += pauseDuration;
    }

    this.session.isRunning = false;
    this.session.isPaused = false;
    this.session.endTime = new Date();

    const completedSession = this.session;
    this.session = null;
    this.pauseStartTime = null;

    return completedSession;
  }

  /**
   * Get current work session
   */
  getCurrentSession(): WorkSession | null {
    return this.session;
  }

  /**
   * Restore a work session from saved data
   */
  restoreSession(savedSession: WorkSession): void {
    this.session = {
      ...savedSession,
      startTime: new Date(savedSession.startTime),
      endTime: savedSession.endTime
        ? new Date(savedSession.endTime)
        : undefined,
    };

    if (this.session.isPaused) {
      this.pauseStartTime = new Date();
    }
  }

  /**
   * Get elapsed time since work started
   */
  getElapsedTime(): TimeDisplay {
    if (!this.session) {
      return this.createTimeDisplay(0);
    }

    const now = Date.now();
    const startTime = this.session.startTime.getTime();
    let elapsedMs = now - startTime - this.session.pausedDuration;

    // If currently paused, subtract the current pause duration
    if (this.session.isPaused && this.pauseStartTime) {
      elapsedMs -= now - this.pauseStartTime.getTime();
    }

    return this.createTimeDisplay(Math.max(0, elapsedMs));
  }

  /**
   * Get remaining time until work is completed
   */
  getRemainingTime(): TimeDisplay {
    if (!this.session) {
      return this.createTimeDisplay(0);
    }

    const elapsed = this.getElapsedTime();
    let targetMs: number;

    if (this.session.settings.workMode === "totalHours") {
      targetMs = this.session.settings.totalHours * 60 * 60 * 1000;
    } else {
      // Calculate time until end time
      const today = new Date();
      const [hours, minutes] = this.session.settings.endTime
        .split(":")
        .map(Number);
      const endTime = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        hours,
        minutes
      );

      // If end time is tomorrow (past midnight)
      if (endTime.getTime() < this.session.startTime.getTime()) {
        endTime.setDate(endTime.getDate() + 1);
      }

      targetMs = endTime.getTime() - this.session.startTime.getTime();
    }

    const remainingMs = targetMs - elapsed.totalMilliseconds;
    const isOvertime = remainingMs < 0;

    return {
      ...this.createTimeDisplay(Math.abs(remainingMs)),
      isOvertime,
    };
  }

  /**
   * Check if work session is completed
   */
  isCompleted(): boolean {
    const remaining = this.getRemainingTime();
    return remaining.totalMilliseconds === 0 && !remaining.isOvertime;
  }

  /**
   * Get session state
   */
  getState(): "idle" | "running" | "paused" | "completed" {
    if (!this.session) {
      return "idle";
    }

    if (this.isCompleted()) {
      return "completed";
    }

    if (this.session.isPaused) {
      return "paused";
    }

    if (this.session.isRunning) {
      return "running";
    }

    return "idle";
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create TimeDisplay object from milliseconds
   */
  private createTimeDisplay(totalMs: number): TimeDisplay {
    const totalSeconds = Math.floor(totalMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      hours,
      minutes,
      seconds,
      totalMilliseconds: totalMs,
      isOvertime: false,
    };
  }

  /**
   * Format time display as string
   */
  formatTimeDisplay(
    timeDisplay: TimeDisplay,
    format: "full" | "short" = "full",
    use24Hour: boolean = true
  ): string {
    const { hours, minutes, seconds, isOvertime } = timeDisplay;

    let formatted: string;
    
    // Both short and full formats now use HH:MM:SS
    if (use24Hour) {
      formatted = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    } else {
      // 12-hour format with HH:MM:SS AM/PM
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      const ampm = hours >= 12 ? "PM" : "AM";
      formatted = `${displayHours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")} ${ampm}`;
    }

    return isOvertime ? `-${formatted}` : formatted;
  }
}
