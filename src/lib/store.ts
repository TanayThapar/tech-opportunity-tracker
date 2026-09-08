import fs from 'fs';
import path from 'path';
import { TechOpportunity, PipelineRunLog } from '@/types';
import { SEED_OPPORTUNITIES } from '@/data/seedOpportunities';

const DATA_DIR = path.join(process.cwd(), '.data');
const EVENTS_FILE = path.join(DATA_DIR, 'opportunities.json');
const LOGS_FILE = path.join(DATA_DIR, 'pipeline_logs.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Initializes store with seed data if file doesn't exist yet
 */
export function getOpportunities(): TechOpportunity[] {
  ensureDataDir();
  if (!fs.existsSync(EVENTS_FILE)) {
    saveOpportunities(SEED_OPPORTUNITIES);
    return SEED_OPPORTUNITIES;
  }
  try {
    const raw = fs.readFileSync(EVENTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading opportunities from storage:', err);
    return SEED_OPPORTUNITIES;
  }
}

export function saveOpportunities(opportunities: TechOpportunity[]): void {
  ensureDataDir();
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(opportunities, null, 2), 'utf-8');
}

export function getPipelineLogs(): PipelineRunLog[] {
  ensureDataDir();
  if (!fs.existsSync(LOGS_FILE)) {
    const initialLog: PipelineRunLog = {
      id: 'log-seed',
      timestamp: new Date().toISOString(),
      status: 'success',
      events_scanned: 12,
      events_added: 12,
      duplicates_skipped: 0,
      events_archived: 0,
      low_confidence_count: 3,
      errors: [],
      details: {
        added_titles: SEED_OPPORTUNITIES.map(o => o.title),
        skipped_titles: []
      }
    };
    savePipelineLogs([initialLog]);
    return [initialLog];
  }
  try {
    const raw = fs.readFileSync(LOGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading pipeline logs:', err);
    return [];
  }
}

export function savePipelineLogs(logs: PipelineRunLog[]): void {
  ensureDataDir();
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

export function appendPipelineLog(log: PipelineRunLog): void {
  const currentLogs = getPipelineLogs();
  currentLogs.unshift(log); // newest first
  // Keep last 100 runs
  if (currentLogs.length > 100) {
    currentLogs.splice(100);
  }
  savePipelineLogs(currentLogs);
}
