import { NextResponse } from 'next/server';
import { runDiscoveryPipeline } from '@/lib/pipeline';

// Allow Vercel Cron or manual trigger
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Optional bearer auth verification if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
    }

    let customCandidates = undefined;
    try {
      const body = await request.json();
      if (body?.candidates && Array.isArray(body.candidates)) {
        customCandidates = body.candidates;
      }
    } catch {
      // Body may be empty on standard cron trigger
    }

    const result = await runDiscoveryPipeline(customCandidates);

    return NextResponse.json({
      success: true,
      message: `Discovery pipeline finished successfully: +${result.log.events_added} added, ${result.log.duplicates_skipped} duplicates skipped, ${result.log.events_archived} archived.`,
      log: result.log,
      newEvents: result.newOpportunities
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Support GET for standard Vercel Cron trigger
export async function GET(request: Request) {
  return POST(request);
}
