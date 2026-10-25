import { NextResponse } from 'next/server';
import { runDiscoveryPipeline } from '@/lib/pipeline';
import { verifyCronSecret, getAuthenticatedUser } from '@/lib/serverAuth';
import { recordPipelineRunTime, setPipelineRunningStatus } from '@/lib/refreshScheduler';

// Allow Vercel Cron or authenticated manual trigger
export async function POST(request: Request) {
  try {
    setPipelineRunningStatus(true);
    const authHeader = request.headers.get('authorization');
    const isCronAuthorized = verifyCronSecret(authHeader);

    // If not authorized via cron secret, check if signed-in user is an admin
    let isAdminAuthorized = false;
    let authenticatedUser = null;

    if (!isCronAuthorized) {
      authenticatedUser = await getAuthenticatedUser(request);
      if (authenticatedUser?.role === 'admin' || authenticatedUser?.role === 'moderator') {
        isAdminAuthorized = true;
      }
    }

    if (!isCronAuthorized && !isAdminAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid CRON_SECRET or Admin session required.' },
        { status: 401 }
      );
    }

    // Spec rule: If triggered by cron, ignore candidates in request body!
    // Only server-verified admins/moderators can pass custom candidates, which go to needs_review.
    let customCandidates = undefined;
    if (isAdminAuthorized) {
      try {
        const body = await request.json();
        if (body?.candidates && Array.isArray(body.candidates)) {
          customCandidates = body.candidates;
        }
      } catch {
        // Body may be empty
      }
    }

    const result = await runDiscoveryPipeline({
      customCandidates,
      triggeredByAdmin: isAdminAuthorized,
    });

    recordPipelineRunTime();

    return NextResponse.json({
      success: true,
      message: `Discovery pipeline finished successfully: +${result.log.events_added} added, ${result.log.duplicates_skipped} duplicates skipped, ${result.log.events_archived} archived.`,
      log: result.log,
      newEvents: result.newOpportunities,
      updatedEvents: result.updatedOpportunities,
    });
  } catch (error: any) {
    setPipelineRunningStatus(false);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Support GET for standard Vercel Cron trigger (Vercel cron calls GET with Authorization: Bearer <CRON_SECRET>)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!verifyCronSecret(authHeader)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Valid CRON_SECRET bearer token required for GET cron execution.' },
      { status: 401 }
    );
  }

  try {
    setPipelineRunningStatus(true);
    // Cron execution never passes custom candidates
    const result = await runDiscoveryPipeline();
    recordPipelineRunTime();
    return NextResponse.json({
      success: true,
      message: `Vercel Cron run completed: +${result.log.events_added} added, ${result.log.duplicates_skipped} duplicates skipped, ${result.log.events_archived} archived.`,
      log: result.log,
    });
  } catch (error: any) {
    setPipelineRunningStatus(false);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
