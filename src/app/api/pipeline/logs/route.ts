import { NextResponse } from 'next/server';
import { getPipelineLogs } from '@/lib/store';

export async function GET() {
  try {
    const logs = getPipelineLogs();
    return NextResponse.json({ success: true, count: logs.length, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
