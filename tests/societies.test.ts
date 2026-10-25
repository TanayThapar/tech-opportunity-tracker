import { describe, it, expect } from 'vitest';
import { detectSocieties, matchesSociety, getSocietyStats } from '../src/lib/societyUtils';
import { TechOpportunity } from '../src/types';

describe('Society Utilities (ACM & IEEE detection and filtering)', () => {
  it('correctly detects ACM from title, organizer, or ACM SIGs', () => {
    const opp1 = {
      title: 'ACM HotOS 2027: 21st Workshop on Hot Topics in Operating Systems',
      organizer: 'ACM SIGOPS',
      description: 'Systems workshop',
      source_url: 'https://www.sigops.org',
    };
    expect(detectSocieties(opp1)).toContain('ACM');
    expect(detectSocieties(opp1)).not.toContain('IEEE');

    const opp2 = {
      title: 'SIGMOD 2027: International Conference on Management of Data',
      organizer: 'SIGMOD Executive Committee',
      description: 'Database research',
      source_url: 'https://sigmod.org',
    };
    expect(detectSocieties(opp2)).toContain('ACM');
  });

  it('correctly detects IEEE from title, organizer, or IEEE societies', () => {
    const opp1 = {
      title: 'IEEE INFOCOM 2027: 46th IEEE Conference on Computer Communications',
      organizer: 'IEEE Computer Society',
      description: 'Computer networking',
      source_url: 'https://infocom2027.ieee-infocom.org',
    };
    expect(detectSocieties(opp1)).toContain('IEEE');
    expect(detectSocieties(opp1)).not.toContain('ACM');

    const opp2 = {
      title: 'CVPR 2027: Conference on Computer Vision and Pattern Recognition',
      organizer: 'CVF',
      description: 'Vision conference',
      source_url: 'https://thecvf.com/cvpr2027',
    };
    expect(detectSocieties(opp2)).toContain('IEEE');
  });

  it('correctly detects joint ACM and IEEE events', () => {
    const jointOpp = {
      title: 'IEEE/ACM MICRO 2027: International Symposium on Microarchitecture',
      organizer: 'IEEE Computer Society & ACM SIGARCH',
      description: 'Microarchitecture forum',
      source_url: 'https://www.microarch.org',
    };
    const societies = detectSocieties(jointOpp);
    expect(societies).toContain('ACM');
    expect(societies).toContain('IEEE');
  });

  it('correctly detects USENIX events', () => {
    const usenixOpp = {
      title: 'USENIX OSDI 2027: Symposium on Operating Systems Design and Implementation',
      organizer: 'USENIX Association',
      description: 'Operating systems research',
      source_url: 'https://www.usenix.org/conference/osdi27',
    };
    expect(detectSocieties(usenixOpp)).toContain('USENIX');
  });

  it('matchesSociety filters opportunities correctly', () => {
    const acmItem = {
      id: 'opp-acm',
      title: 'ACM HotNets 2027',
      type: 'workshop',
      organizer: 'ACM SIGCOMM',
      start_date: '2026-11-16',
      end_date: '2026-11-17',
      format: 'in-person',
      source_url: 'https://conferences.sigcomm.org',
      description: 'HotNets workshop',
      discovery_confidence: 'high',
      status: 'published',
      created_at: '2026-10-01T10:00:00Z',
      updated_at: '2026-10-01T10:00:00Z',
    } as TechOpportunity;

    const ieeeItem = {
      id: 'opp-ieee',
      title: 'IEEE ICRA 2027: Robotics and Automation',
      type: 'conference',
      organizer: 'IEEE Robotics and Automation Society',
      start_date: '2027-05-24',
      end_date: '2027-05-28',
      format: 'in-person',
      source_url: 'https://www.ieee-ras.org',
      description: 'Robotics flagship',
      discovery_confidence: 'high',
      status: 'published',
      created_at: '2026-10-01T10:00:00Z',
      updated_at: '2026-10-01T10:00:00Z',
    } as TechOpportunity;

    const jointItem = {
      id: 'opp-joint',
      title: 'ASPLOS 2027: Architectural Support for Programming Languages and OS',
      type: 'conference',
      organizer: 'ACM SIGARCH / IEEE TCCA',
      start_date: '2027-03-22',
      end_date: '2027-03-26',
      format: 'in-person',
      source_url: 'https://asplos-conference.org',
      description: 'Joint ACM and IEEE symposium',
      discovery_confidence: 'high',
      status: 'published',
      created_at: '2026-10-01T10:00:00Z',
      updated_at: '2026-10-01T10:00:00Z',
    } as TechOpportunity;

    // Filter 'all' matches everything
    expect(matchesSociety(acmItem, 'all')).toBe(true);
    expect(matchesSociety(ieeeItem, 'all')).toBe(true);
    expect(matchesSociety(jointItem, 'all')).toBe(true);

    // Filter 'acm'
    expect(matchesSociety(acmItem, 'acm')).toBe(true);
    expect(matchesSociety(ieeeItem, 'acm')).toBe(false);
    expect(matchesSociety(jointItem, 'acm')).toBe(true);

    // Filter 'ieee'
    expect(matchesSociety(acmItem, 'ieee')).toBe(false);
    expect(matchesSociety(ieeeItem, 'ieee')).toBe(true);
    expect(matchesSociety(jointItem, 'ieee')).toBe(true);
  });

  it('getSocietyStats computes accurate aggregate totals', () => {
    const list = [
      {
        id: '1',
        title: 'ACM HotOS',
        type: 'workshop',
        organizer: 'ACM SIGOPS',
        start_date: '2027-05-18',
        end_date: '2027-05-20',
        format: 'in-person',
        source_url: 'https://www.sigops.org',
        description: '',
        discovery_confidence: 'high',
        status: 'published',
        created_at: '2026-10-01T10:00:00Z',
        updated_at: '2026-10-01T10:00:00Z',
      },
      {
        id: '2',
        title: 'IEEE INFOCOM',
        type: 'conference',
        organizer: 'IEEE Computer Society',
        start_date: '2027-05-10',
        end_date: '2027-05-13',
        format: 'in-person',
        source_url: 'https://infocom2027.ieee-infocom.org',
        description: '',
        discovery_confidence: 'high',
        status: 'published',
        created_at: '2026-10-01T10:00:00Z',
        updated_at: '2026-10-01T10:00:00Z',
      },
      {
        id: '3',
        title: 'IEEE/ACM MICRO',
        type: 'conference',
        organizer: 'IEEE / ACM SIGARCH',
        start_date: '2027-10-16',
        end_date: '2027-10-20',
        format: 'in-person',
        source_url: 'https://www.microarch.org',
        description: '',
        discovery_confidence: 'high',
        status: 'published',
        created_at: '2026-10-01T10:00:00Z',
        updated_at: '2026-10-01T10:00:00Z',
      },
    ] as TechOpportunity[];

    const stats = getSocietyStats(list);
    expect(stats.acm).toBe(2); // opp 1 & 3
    expect(stats.ieee).toBe(2); // opp 2 & 3
    expect(stats.usenix).toBe(0);
  });
});
