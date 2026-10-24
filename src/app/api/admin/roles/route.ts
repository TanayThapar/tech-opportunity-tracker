import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/serverAuth';
import { updateUserRole, getProfileById } from '@/lib/store';
import { UserRole } from '@/types/auth';

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireRole(request, ['admin']);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await request.json();
    const { targetUserId, newRole } = body;

    if (!targetUserId || !newRole) {
      return NextResponse.json(
        { success: false, error: 'targetUserId and newRole are required' },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = ['user', 'moderator', 'admin'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { success: false, error: `Invalid role "${newRole}". Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const targetProfile = await getProfileById(targetUserId);
    if (!targetProfile) {
      return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 404 });
    }

    const success = await updateUserRole(targetUserId, newRole, user!.email || user!.handle || user!.id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `User ${targetUserId} role updated to ${newRole}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
