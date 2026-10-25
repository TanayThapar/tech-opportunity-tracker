import { NextResponse } from 'next/server';
import { getRefreshStatus, setRefreshIntervalHours } from '@/lib/refreshScheduler';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export async function GET() {
  const status = getRefreshStatus();
  return NextResponse.json({ success: true, data: status });
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    // Allow admin or moderator to update refresh interval
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin or moderator session required to configure refresh interval.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const intervalHours = Number(body.intervalHours);

    if (!intervalHours || isNaN(intervalHours) || intervalHours < 1 || intervalHours > 72) {
      return NextResponse.json(
        { success: false, error: 'Invalid interval: Must be between 1 and 72 hours.' },
        { status: 400 }
      );
    }

    const updated = setRefreshIntervalHours(intervalHours);
    const status = getRefreshStatus();

    return NextResponse.json({
      success: true,
      message: `Scraper refresh interval successfully set to every ${updated} hours.`,
      data: status,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
