/**
 * Refresh Scheduler & Interval Manager
 *
 * Manages automated periodic scraping and refresh cycles for opportunities.
 * Allows configurable intervals (e.g. 1h, 6h, 12h, 24h) and tracks last run
 * and next scheduled run timestamps.
 */

let configuredIntervalHours = 6; // Default to 6 hours
let lastRunTimestamp: number | null = null;
let isPipelineRunning = false;

export interface RefreshStatus {
  lastRunAt: string | null;
  nextRunAt: string | null;
  intervalHours: number;
  isRunning: boolean;
  timeRemainingSeconds: number | null;
  isStale: boolean;
}

export function getRefreshIntervalHours(): number {
  return configuredIntervalHours;
}

export function setRefreshIntervalHours(hours: number): number {
  if (hours >= 1 && hours <= 72) {
    configuredIntervalHours = hours;
  }
  return configuredIntervalHours;
}

export function setPipelineRunningStatus(running: boolean) {
  isPipelineRunning = running;
}

export function recordPipelineRunTime(time = Date.now()) {
  lastRunTimestamp = time;
  isPipelineRunning = false;
}

export function getRefreshStatus(): RefreshStatus {
  const now = Date.now();
  const intervalMs = configuredIntervalHours * 60 * 60 * 1000;

  let nextRunAtMs: number | null = null;
  let timeRemainingSec: number | null = null;
  let isStale = false;

  if (lastRunTimestamp) {
    nextRunAtMs = lastRunTimestamp + intervalMs;
    const diff = Math.max(0, Math.floor((nextRunAtMs - now) / 1000));
    timeRemainingSec = diff;
    isStale = now >= nextRunAtMs;
  } else {
    // If never run yet, next run is immediate
    isStale = true;
    timeRemainingSec = 0;
  }

  return {
    lastRunAt: lastRunTimestamp ? new Date(lastRunTimestamp).toISOString() : null,
    nextRunAt: nextRunAtMs ? new Date(nextRunAtMs).toISOString() : null,
    intervalHours: configuredIntervalHours,
    isRunning: isPipelineRunning,
    timeRemainingSeconds: timeRemainingSec,
    isStale,
  };
}

export function shouldAutoRefresh(): boolean {
  if (isPipelineRunning) return false;
  if (!lastRunTimestamp) return true;
  const elapsed = Date.now() - lastRunTimestamp;
  return elapsed >= configuredIntervalHours * 60 * 60 * 1000;
}
