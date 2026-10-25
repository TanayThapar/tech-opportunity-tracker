/**
 * Deadline Collision Radar & Crunch Detection Engine
 * 
 * Identifies high-stress periods where multiple paper submissions,
 * hackathon start dates, or application deadlines cluster within a tight window.
 */

import { TechOpportunity, DeadlineCollisionCluster } from '@/types';
import { differenceInDays, parseISO, format } from 'date-fns';

export interface ActionableDeadline {
  opportunity: TechOpportunity;
  dateStr: string;
  dateObj: Date;
  type: 'submission' | 'application' | 'event_start';
}

/**
 * Extracts the primary upcoming actionable deadline for an opportunity.
 */
export function getActionableDeadline(opp: TechOpportunity): ActionableDeadline | null {
  const targetStr = opp.submission_deadline || opp.application_deadline || opp.start_date;
  if (!targetStr) return null;

  try {
    const dateObj = parseISO(targetStr);
    if (isNaN(dateObj.getTime())) return null;

    let deadlineType: 'submission' | 'application' | 'event_start' = 'event_start';
    if (opp.submission_deadline) deadlineType = 'submission';
    else if (opp.application_deadline) deadlineType = 'application';

    return {
      opportunity: opp,
      dateStr: targetStr,
      dateObj,
      type: deadlineType,
    };
  } catch {
    return null;
  }
}

/**
 * Analyzes an opportunity set and identifies collision clusters where 2 or more
 * deadlines fall within windowDays of each other.
 */
export function detectDeadlineCollisions(
  opportunities: TechOpportunity[],
  windowDays = 6,
  onlyFuture = true
): DeadlineCollisionCluster[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Gather valid deadlines
  const deadlines: ActionableDeadline[] = [];
  for (const opp of opportunities) {
    const act = getActionableDeadline(opp);
    if (!act) continue;

    if (onlyFuture) {
      const daysFromToday = differenceInDays(act.dateObj, today);
      // Keep events from today up to 120 days out
      if (daysFromToday < 0 || daysFromToday > 120) continue;
    }

    deadlines.push(act);
  }

  // 2. Sort chronologically by deadline date
  deadlines.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  if (deadlines.length < 2) return [];

  // 3. Cluster adjacent deadlines within windowDays
  const clusters: ActionableDeadline[][] = [];
  let currentGroup: ActionableDeadline[] = [deadlines[0]];

  for (let i = 1; i < deadlines.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = deadlines[i];
    const gap = differenceInDays(curr.dateObj, prev.dateObj);

    if (gap <= windowDays) {
      currentGroup.push(curr);
    } else {
      if (currentGroup.length >= 2) {
        clusters.push(currentGroup);
      }
      currentGroup = [curr];
    }
  }

  if (currentGroup.length >= 2) {
    clusters.push(currentGroup);
  }

  // 4. Transform into rich DeadlineCollisionCluster representations
  return clusters.map((group, index) => {
    const first = group[0];
    const last = group[group.length - 1];
    const daysSpan = Math.max(1, differenceInDays(last.dateObj, first.dateObj) + 1);
    const count = group.length;

    let severity: 'low' | 'medium' | 'critical' = 'low';
    if (count >= 4 || (count >= 3 && daysSpan <= 3)) {
      severity = 'critical';
    } else if (count >= 3 || daysSpan <= 2) {
      severity = 'medium';
    }

    const titles = group.map(g => g.opportunity.title);
    const formattedStart = format(first.dateObj, 'MMM d');
    const formattedEnd = format(last.dateObj, 'MMM d, yyyy');

    const title =
      severity === 'critical'
        ? `🔥 Critical Crunch: ${count} Deadlines in ${daysSpan} Days`
        : severity === 'medium'
        ? `⚠️ High Congestion: ${count} Deadlines in ${daysSpan} Days`
        : `⚡ Deadline Overlap: ${count} Deadlines in ${daysSpan} Days`;

    const message = `${formattedStart} – ${formattedEnd}: ${titles.slice(0, 3).join(', ')}${
      titles.length > 3 ? ` +${titles.length - 3} more` : ''
    }`;

    return {
      id: `cluster-${index}-${first.dateStr}`,
      startDate: first.dateStr,
      endDate: last.dateStr,
      daysSpan,
      severity,
      opportunities: group.map(g => g.opportunity),
      title,
      message,
    };
  });
}

/**
 * Checks if a specific opportunity ID is involved in any active collision cluster.
 */
export function getOpportunityCollision(
  opportunityId: string,
  clusters: DeadlineCollisionCluster[]
): DeadlineCollisionCluster | null {
  for (const cluster of clusters) {
    if (cluster.opportunities.some(o => o.id === opportunityId)) {
      return cluster;
    }
  }
  return null;
}
