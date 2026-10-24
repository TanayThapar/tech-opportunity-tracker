import { NextResponse } from 'next/server';
import { requireRole, isImmutableRootAdmin } from '@/lib/serverAuth';
import { updateUserRole, getProfileById, getAllProfiles } from '@/lib/store';
import { UserRole } from '@/types/auth';

export async function GET(request: Request) {
  try {
    const { errorResponse } = await requireRole(request, ['admin']);
    if (errorResponse) {
      return errorResponse;
    }

    const profiles = await getAllProfiles();
    const sanitized = profiles.map(({ passwordHash: _, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      count: sanitized.length,
      data: sanitized,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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

    // Protection rule: TanayThapar and Sanvi850 are immutable root administrators defined in source code
    if (
      isImmutableRootAdmin(targetProfile.handle) ||
      isImmutableRootAdmin(targetProfile.email) ||
      isImmutableRootAdmin(targetProfile.id)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Protected Account: TanayThapar and Sanvi850 have the highest level of administrative access locked in source code and cannot be modified.',
        },
        { status: 403 }
      );
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
