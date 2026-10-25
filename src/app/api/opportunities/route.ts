import { NextResponse } from 'next/server';
import {
  getOpportunities,
  addOpportunity,
  updateOpportunity,
  appendAuditLog,
} from '@/lib/store';
import { TechOpportunity, OpportunityType } from '@/types';
import { evaluateDuplicate } from '@/lib/fuzzy';
import { checkUrlLiveness } from '@/lib/safeFetch';
import { getAuthenticatedUser, requireRole } from '@/lib/serverAuth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const tier = searchParams.get('tier') || undefined;
    const company = searchParams.get('company') || undefined;
    const subfield = searchParams.get('subfield') || undefined;
    const requestedStatus = searchParams.get('status') || 'published';

    // Problem 2: Only published items are public.
    // Querying needs_review or archived requires server-verified moderator or admin role.
    if (requestedStatus !== 'published') {
      const user = await getAuthenticatedUser(request);
      if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Viewing unpublished items requires moderator or admin role' },
          { status: 403 }
        );
      }
    }

    const events = await getOpportunities({
      status: requestedStatus,
      type,
      tier,
      company,
      subfield,
    });

    return NextResponse.json({ success: true, count: events.length, data: events });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * User opportunity submission.
 * Rules:
 * - Always created as status: 'needs_review' with origin: 'user_submitted'.
 * - SSRF safe check on source URL.
 * - Cannot auto-publish.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      type,
      conference_tier,
      organizer,
      company,
      start_date,
      end_date,
      submission_deadline,
      application_deadline,
      format,
      location,
      source_url,
      description,
      submitted_by,
      contributors,
    } = body;

    if (!title || !type || (!organizer && !company) || !source_url) {
      return NextResponse.json(
        { success: false, error: 'Missing mandatory fields: title, type, organizer/company, source_url' },
        { status: 400 }
      );
    }

    // SSRF safe liveness probe
    const liveness = await checkUrlLiveness(source_url);
    if (!liveness.ok) {
      return NextResponse.json(
        { success: false, error: `Invalid or unreachable source URL (${liveness.error || 'Connection failed'}). Must be a live, public URL.` },
        { status: 400 }
      );
    }

    const orgName = (company || organizer).trim();
    const startDate = start_date || new Date().toISOString().slice(0, 10);
    const endDate = end_date || application_deadline || new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);

    const allExisting = await getOpportunities();
    const dupCheck = evaluateDuplicate(
      { title, organizer: orgName, start_date: startDate, source_url },
      allExisting.map(e => ({
        id: e.id,
        title: e.title,
        organizer: e.organizer,
        start_date: e.start_date,
        source_url: e.source_url,
      }))
    );

    if (dupCheck.isDuplicate) {
      return NextResponse.json(
        { success: false, error: `Duplicate detected. Matches existing opportunity "${dupCheck.matchedTitle}"` },
        { status: 409 }
      );
    }

    const newOpp: TechOpportunity = {
      id: `opp-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      type: type as OpportunityType,
      conference_tier: conference_tier || null,
      organizer: orgName,
      company: type === 'job' ? orgName : undefined,
      start_date: startDate,
      end_date: endDate,
      submission_deadline: submission_deadline || null,
      application_deadline: application_deadline || null,
      format: format || 'online',
      location: location?.trim() || null,
      source_url: source_url.trim(),
      description: description?.trim() || 'Community-submitted opportunity pending moderator review.',
      discovery_confidence: 'low',
      confidence_reasons: [
        'User submission, pending moderator review',
        'source URL reachable at fetch time',
      ],
      status: 'needs_review', // ALWAYS needs_review
      origin: 'user_submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submitted_by: submitted_by || 'community_user',
      contributors: contributors || [],
      link_status: 'ok',
      listing_status: 'open',
      last_checked_at: new Date().toISOString(),
    };

    const saved = await addOpportunity(newOpp);

    await appendAuditLog({
      category: 'content',
      action: 'OPPORTUNITY_SUBMITTED',
      actor: { handle: submitted_by || 'community_user' },
      target: { type: 'opportunity', id: saved.id, label: saved.title },
      status: 'info',
      description: `New opportunity submitted for review: "${saved.title}" (${saved.type})`,
      metadata: { organizer: saved.organizer, type: saved.type, url: saved.source_url },
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Moderator / Admin update & approval route.
 */
export async function PATCH(request: Request) {
  try {
    const { user, errorResponse } = await requireRole(request, ['moderator', 'admin']);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await request.json();
    const {
      id,
      status,
      discovery_confidence,
      conference_tier,
      submission_deadline,
      application_deadline,
      start_date,
      end_date,
      contributors,
      approval_basis,
      listing_status,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing opportunity ID' }, { status: 400 });
    }

    const updates: Partial<TechOpportunity> = {};

    if (status) {
      updates.status = status;
      // If approving item to published, record provenance
      if (status === 'published') {
        updates.approved_by = user!.email || user!.handle || user!.id;
        updates.approved_at = new Date().toISOString();
        updates.approval_basis = approval_basis || 'Verified by moderator';
        updates.discovery_confidence = 'high';
      }
    }

    if (discovery_confidence) updates.discovery_confidence = discovery_confidence;
    if (conference_tier !== undefined) updates.conference_tier = conference_tier;
    if (submission_deadline !== undefined) updates.submission_deadline = submission_deadline;
    if (application_deadline !== undefined) updates.application_deadline = application_deadline;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (contributors !== undefined) updates.contributors = contributors;
    if (listing_status !== undefined) updates.listing_status = listing_status;

    const updated = await updateOpportunity(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Opportunity not found' }, { status: 404 });
    }

    const isApproval = status === 'published';
    await appendAuditLog({
      category: 'admin',
      action: isApproval ? 'OPPORTUNITY_APPROVED' : 'OPPORTUNITY_UPDATED',
      actor: { id: user?.id, handle: user?.handle, email: user?.email, role: user?.role },
      target: { type: 'opportunity', id: updated.id, label: updated.title },
      status: 'success',
      description: isApproval
        ? `Moderator @${user?.handle} approved opportunity "${updated.title}" into public radar`
        : `Moderator @${user?.handle} updated opportunity "${updated.title}" (${Object.keys(updates).join(', ')})`,
      metadata: { updates },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
