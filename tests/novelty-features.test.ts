import { describe, it, expect } from 'vitest';
import { TechOpportunity } from '@/types';
import {
  detectDeadlineCollisions,
  getOpportunityCollision,
  getActionableDeadline,
} from '@/lib/collisionRadar';
import {
  generateIcsFeed,
  formatIcsDate,
  foldIcsLine,
  escapeIcsText,
} from '@/lib/ical';
import {
  extractSkills,
  calculateSkillMatch,
  POPULAR_TECH_SKILLS,
} from '@/lib/skillMatcher';

describe('Feature #1: Deadline Collision Radar', () => {
  const baseOpp: TechOpportunity = {
    id: 'opp-1',
    title: 'ACM Conference on Computer & Communications Security (CCS)',
    type: 'conference',
    organizer: 'ACM SIGSAC',
    start_date: '2026-11-15',
    end_date: '2026-11-19',
    submission_deadline: '2026-10-25T23:59:59Z',
    format: 'in-person',
    location: 'Taipei, Taiwan',
    source_url: 'https://www.sigsac.org/ccs/CCS2026/',
    description: 'Premier security conference.',
    origin: 'adapter',
    discovery_confidence: 'high',
    status: 'published',
    created_at: '2026-10-25T00:00:00Z',
    updated_at: '2026-10-25T00:00:00Z',
  };

  it('correctly identifies actionable submission deadline', () => {
    const act = getActionableDeadline(baseOpp);
    expect(act).not.toBeNull();
    expect(act?.type).toBe('submission');
    expect(act?.dateStr).toBe('2026-10-25T23:59:59Z');
  });

  it('detects a deadline collision when multiple deadlines are within 6 days', () => {
    const opps: TechOpportunity[] = [
      {
        ...baseOpp,
        id: 'opp-1',
        title: 'ACM CCS 2026',
        submission_deadline: '2026-10-26T23:59:59Z',
      },
      {
        ...baseOpp,
        id: 'opp-2',
        title: 'EMNLP 2026',
        submission_deadline: '2026-10-28T23:59:59Z',
      },
      {
        ...baseOpp,
        id: 'opp-3',
        title: 'ACM MobiCom 2026',
        submission_deadline: '2026-10-29T23:59:59Z',
      },
    ];

    const clusters = detectDeadlineCollisions(opps, 6, false);
    expect(clusters.length).toBe(1);
    expect(clusters[0].opportunities.length).toBe(3);
    expect(clusters[0].daysSpan).toBeLessThanOrEqual(4);
    // 3 deadlines within 3 days is critical or medium
    expect(['medium', 'critical']).toContain(clusters[0].severity);
  });

  it('does not cluster deadlines separated by more than window days', () => {
    const opps: TechOpportunity[] = [
      {
        ...baseOpp,
        id: 'opp-1',
        title: 'Event A',
        submission_deadline: '2026-10-01T23:59:59Z',
      },
      {
        ...baseOpp,
        id: 'opp-2',
        title: 'Event B',
        submission_deadline: '2026-10-25T23:59:59Z',
      },
    ];

    const clusters = detectDeadlineCollisions(opps, 6, false);
    expect(clusters.length).toBe(0);
  });

  it('identifies if a specific opportunity is in a collision cluster', () => {
    const opps: TechOpportunity[] = [
      {
        ...baseOpp,
        id: 'opp-1',
        submission_deadline: '2026-10-26T23:59:59Z',
      },
      {
        ...baseOpp,
        id: 'opp-2',
        submission_deadline: '2026-10-27T23:59:59Z',
      },
      {
        ...baseOpp,
        id: 'opp-3',
        submission_deadline: '2026-12-01T23:59:59Z',
      },
    ];

    const clusters = detectDeadlineCollisions(opps, 6, false);
    expect(clusters.length).toBe(1);

    const collision1 = getOpportunityCollision('opp-1', clusters);
    expect(collision1).not.toBeNull();
    expect(collision1?.id).toBe(clusters[0].id);

    const collision3 = getOpportunityCollision('opp-3', clusters);
    expect(collision3).toBeNull();
  });
});

describe('Feature #2: Live RFC 5545 iCalendar Feed Engine', () => {
  const opps: TechOpportunity[] = [
    {
      id: 'opp-ical-1',
      title: 'NeurIPS 2026',
      type: 'conference',
      organizer: 'Neural Information Processing Systems',
      start_date: '2026-12-08',
      end_date: '2026-12-14',
      submission_deadline: '2026-05-21T23:59:59Z',
      format: 'in-person',
      location: 'Vancouver, Canada',
      source_url: 'https://nips.cc/Conferences/2026',
      description: 'Conference on Neural Information Processing Systems.',
      origin: 'adapter',
      discovery_confidence: 'high',
      status: 'published',
      created_at: '2026-10-25T00:00:00Z',
      updated_at: '2026-10-25T00:00:00Z',
    },
  ];

  it('escapes special RFC 5545 characters correctly', () => {
    const raw = 'Text with, comma; semicolon and \n newline\\slash';
    const escaped = escapeIcsText(raw);
    expect(escaped).toContain('\\,');
    expect(escaped).toContain('\\;');
    expect(escaped).toContain('\\n');
  });

  it('folds lines exceeding 75 octets according to RFC 5545 section 3.1', () => {
    const longLine = 'DESCRIPTION:This is a very long line that definitely exceeds seventy-five octets and must be folded by the RFC 5545 formatter.';
    const folded = foldIcsLine(longLine);
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i].startsWith(' ')).toBe(true);
    }
  });

  it('formats calendar dates and datetimes in standard UTC representation', () => {
    const dateFormatted = formatIcsDate('2026-12-08');
    expect(dateFormatted).toBe('20261208T000000Z');

    const dtFormatted = formatIcsDate('2026-05-21T23:59:59Z');
    expect(dtFormatted).toMatch(/^\d{8}T\d{6}Z$/);
  });

  it('generates a full RFC 5545 calendar feed with VEVENT and VALARM', () => {
    const ics = generateIcsFeed(opps, {
      calName: 'Test Tech Deadlines',
      calDesc: 'Automated Feed Test',
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Tech Opportunity Tracker//EN');
    expect(ics).toContain('X-WR-CALNAME:Test Tech Deadlines');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('NeurIPS 2026');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-P1D'); // 24 hour alert
    expect(ics).toContain('TRIGGER:-P7D'); // 1 week alert
    expect(ics).toContain('END:VALARM');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.endsWith('\r\n')).toBe(true);
  });
});

describe('Feature #7: Skill & Tech Stack Matcher Engine', () => {
  it('extracts technical skills from titles, descriptions, and subfields', () => {
    const opp = {
      title: 'Deep Learning and LLM Engineering Research Assistant',
      description: 'Developing PyTorch transformer models, running on distributed Kubernetes GPU clusters with Rust microservices.',
      subfield: 'AI / Machine Learning',
      organizer: 'Open Source AI Labs',
    };

    const skills = extractSkills(opp);
    expect(skills).toContain('PyTorch & Deep Learning');
    expect(skills).toContain('LLMs & Generative AI');
    expect(skills).toContain('Rust');
    expect(skills).toContain('Kubernetes & Cloud Native');
  });

  it('maps CS subfields into default high-signal skill categories', () => {
    const opp = {
      title: 'ACM SOSP 2026',
      description: 'Symposium on Operating Systems Principles',
      subfield: 'Systems & Architecture',
    };

    const skills = extractSkills(opp);
    expect(skills).toContain('Kernel & Low-Level Systems');
    expect(skills).toContain('Distributed Systems');
  });

  it('calculates personalized skill match percentage accurately', () => {
    const oppSkills = ['Python', 'PyTorch & Deep Learning', 'LLMs & Generative AI'];
    const userSkills = ['Python', 'Rust', 'Go'];

    const result = calculateSkillMatch(oppSkills, userSkills);
    expect(result.matchCount).toBe(1);
    expect(result.matchingSkills).toEqual(['Python']);
    expect(result.percentage).toBeGreaterThan(0);
  });

  it('returns 0 match when there is no skill overlap', () => {
    const oppSkills = ['Rust', 'Kernel & Low-Level Systems'];
    const userSkills = ['TypeScript', 'Web3 & Smart Contracts'];

    const result = calculateSkillMatch(oppSkills, userSkills);
    expect(result.matchCount).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.matchingSkills).toHaveLength(0);
  });

  it('has comprehensive canonical popular skills defined', () => {
    expect(POPULAR_TECH_SKILLS.length).toBeGreaterThanOrEqual(15);
    expect(POPULAR_TECH_SKILLS).toContain('Python');
    expect(POPULAR_TECH_SKILLS).toContain('Rust');
    expect(POPULAR_TECH_SKILLS).toContain('Distributed Systems');
  });
});
