import { NextResponse } from 'next/server';
import { getPipelineLogs } from '@/lib/store';
import { requireRole } from '@/lib/serverAuth';

export async function GET(request: Request) {
  try {
    // Problem 4 & 8: Pipeline logs require server-verified admin role
    const { errorResponse } = await requireRole(request, ['admin']);
    if (errorResponse) {
      return errorResponse;
    }

    const logs = await getPipelineLogs();
    return NextResponse.json({ success: true, count: logs.length, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
