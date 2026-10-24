import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import { getNotificationPreference, saveNotificationPreference } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const pref = await getNotificationPreference(user.id);
    return NextResponse.json({ success: true, data: pref });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const existing = await getNotificationPreference(user.id);

    const updated = await saveNotificationPreference({
      ...existing,
      email_enabled: typeof body.email_enabled === 'boolean' ? body.email_enabled : existing.email_enabled,
      in_app_enabled: typeof body.in_app_enabled === 'boolean' ? body.in_app_enabled : existing.in_app_enabled,
      categories: Array.isArray(body.categories) ? body.categories : existing.categories,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
