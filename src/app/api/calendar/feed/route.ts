import { NextRequest, NextResponse } from 'next/server';
import { getOpportunities } from '@/lib/store';
import { generateICalFeed } from '@/lib/ical';
import { matchesSociety, SocietyFilter } from '@/lib/societyUtils';
import { OpportunityType } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get('type');
    const societyParam = searchParams.get('society') as SocietyFilter | null;
    const subfieldParam = searchParams.get('subfield');
    const idsParam = searchParams.get('ids');
    const calName = searchParams.get('name') || 'Tech Opportunities & Deadlines';

    // Retrieve published opportunities
    let opportunities = await getOpportunities({ status: 'published' });

    // Filter by specific IDs (e.g. user personal watchlist)
    if (idsParam) {
      const allowedIds = new Set(idsParam.split(',').map(s => s.trim()));
      opportunities = opportunities.filter(o => allowedIds.has(o.id));
    }

    // Filter by opportunity type
    if (typeParam && typeParam !== 'all') {
      const types = new Set(typeParam.split(',').map(s => s.trim() as OpportunityType));
      opportunities = opportunities.filter(o => types.has(o.type));
    }

    // Filter by society
    if (societyParam && societyParam !== 'all') {
      opportunities = opportunities.filter(o => matchesSociety(o, societyParam));
    }

    // Filter by CS subfield
    if (subfieldParam && subfieldParam !== 'all') {
      opportunities = opportunities.filter(o => o.subfield === subfieldParam);
    }

    const icsContent = generateICalFeed(opportunities, {
      calName,
      calDesc: 'Live synchronized calendar feed from Tech Opportunity Tracker',
      includeDeadlines: searchParams.get('includeDeadlines') !== 'false',
      includeEvents: searchParams.get('includeEvents') !== 'false',
    });

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="tech-opportunities.ics"',
        'Cache-Control': 'public, max-age=300, s-maxage=900',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate calendar feed' },
      { status: 500 }
    );
  }
}
