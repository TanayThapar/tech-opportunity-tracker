import { NextResponse } from 'next/server';
import { getSystemAuditLogs } from '@/lib/store';
import { requireRole } from '@/lib/serverAuth';

export async function GET(request: Request) {
  try {
    const { errorResponse } = await requireRole(request, ['admin', 'moderator']);
    if (errorResponse) {
      return errorResponse;
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const action = searchParams.get('action') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 150;

    const logs = await getSystemAuditLogs({
      category,
      action,
      status,
      search,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
