import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated', user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Auth check failed', user: null },
      { status: 500 }
    );
  }
}
