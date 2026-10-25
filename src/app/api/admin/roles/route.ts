import { NextResponse } from 'next/server';
import { requireRole, isImmutableRootAdmin } from '@/lib/serverAuth';
import { updateUserRole, getProfileById, getAllProfiles, deleteUserProfile, appendAuditLog } from '@/lib/store';
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

    const validRoles: UserRole[] = ['user', 'moderator', 'admin', 'revoked'];
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

    // Admins cannot revoke themselves
    if (newRole === 'revoked' && (targetProfile.id === user?.id || targetProfile.handle.toLowerCase() === user?.handle?.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Self-revocation forbidden: You cannot revoke your own active admin account.' },
        { status: 400 }
      );
    }

    const success = await updateUserRole(targetUserId, newRole, user!.email || user!.handle || user!.id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 });
    }

    const action =
      newRole === 'revoked'
        ? 'ADMIN_ACCOUNT_REVOKED'
        : targetProfile.role === 'revoked'
        ? 'ADMIN_ACCOUNT_RESTORED'
        : 'ADMIN_ROLE_CHANGE';

    const desc =
      newRole === 'revoked'
        ? `Administrator @${user?.handle} revoked access for @${targetProfile.handle}`
        : targetProfile.role === 'revoked'
        ? `Administrator @${user?.handle} restored access for @${targetProfile.handle} with role "${newRole}"`
        : `Administrator @${user?.handle} updated role for @${targetProfile.handle} from "${targetProfile.role}" to "${newRole}"`;

    await appendAuditLog({
      category: 'admin',
      action,
      actor: { id: user?.id, handle: user?.handle, email: user?.email, role: user?.role },
      target: { type: 'user', id: targetProfile.id, label: `@${targetProfile.handle}` },
      status: 'success',
      description: desc,
      metadata: { previousRole: targetProfile.role, newRole },
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetUserId} role updated to ${newRole}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, errorResponse } = await requireRole(request, ['admin']);
    if (errorResponse) {
      return errorResponse;
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const targetProfile = await getProfileById(targetUserId);
    if (!targetProfile) {
      return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 404 });
    }

    // Immutable root admin safety guard
    if (
      isImmutableRootAdmin(targetProfile.handle) ||
      isImmutableRootAdmin(targetProfile.email) ||
      isImmutableRootAdmin(targetProfile.id)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Protected Account: TanayThapar and Sanvi850 are root administrators and cannot be erased.',
        },
        { status: 403 }
      );
    }

    // Admins cannot erase themselves
    if (targetProfile.id === user?.id || targetProfile.handle.toLowerCase() === user?.handle?.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Self-deletion forbidden: You cannot erase your own active admin account.' },
        { status: 400 }
      );
    }

    const deleted = await deleteUserProfile(targetUserId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Failed to erase user profile' }, { status: 500 });
    }

    await appendAuditLog({
      category: 'admin',
      action: 'ADMIN_ACCOUNT_ERASED',
      actor: { id: user?.id, handle: user?.handle, email: user?.email, role: user?.role },
      target: { type: 'user', id: targetProfile.id, label: `@${targetProfile.handle}` },
      status: 'warning',
      description: `Administrator @${user?.handle} permanently erased account @${targetProfile.handle} (${targetProfile.name}) and all associated records`,
      metadata: { erasedUserId: targetUserId, erasedEmail: targetProfile.email },
    });

    return NextResponse.json({
      success: true,
      message: `Account @${targetProfile.handle} (${targetProfile.name}) was completely erased.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
