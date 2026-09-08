import { NextResponse } from 'next/server';
import { getOpportunities, saveOpportunities } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const tier = searchParams.get('tier');
    const confidence = searchParams.get('confidence');
    const status = searchParams.get('status');

    let events = getOpportunities();

    // Default to published unless requested
    if (status) {
      events = events.filter(e => e.status === status);
    } else {
      // Default: show published only
      events = events.filter(e => e.status === 'published');
    }

    if (type && type !== 'all') {
      events = events.filter(e => e.type === type);
    }

    if (tier && tier !== 'all') {
      events = events.filter(e => e.conference_tier === tier);
    }

    if (confidence && confidence !== 'all') {
      events = events.filter(e => e.discovery_confidence === confidence);
    }

    // Sort by start_date ascending
    events.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    return NextResponse.json({ success: true, count: events.length, data: events });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, discovery_confidence, conference_tier } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing opportunity ID' }, { status: 400 });
    }

    const events = getOpportunities();
    const index = events.findIndex(e => e.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    if (status) events[index].status = status;
    if (discovery_confidence) events[index].discovery_confidence = discovery_confidence;
    if (conference_tier !== undefined) events[index].conference_tier = conference_tier;
    events[index].updated_at = new Date().toISOString();

    saveOpportunities(events);
    return NextResponse.json({ success: true, data: events[index] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
