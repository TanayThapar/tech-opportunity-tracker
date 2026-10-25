import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import { appendAuditLog } from '@/lib/store';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (user) {
    await appendAuditLog({
      category: 'auth',
      action: 'AUTH_LOGOUT',
      actor: { id: user.id, handle: user.handle, email: user.email, role: user.role },
      target: { type: 'user', id: user.id, label: `@${user.handle}` },
      status: 'info',
      description: `User @${user.handle} signed out`,
    });
  }

  const response = NextResponse.json({ success: true, message: 'Signed out successfully' });

  // Clear session cookie
  response.cookies.set('radar_session', '', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    sameSite: 'lax',
  });

  return response;
}
