import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

// GET /api/notifications — Fetch notifications for authenticated user
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unread') === 'true';

    const whereClause: Record<string, unknown> = { userId };
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const notifications = await db.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = await db.notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 },
    );
  }
}

// POST /api/notifications — Create a notification for the authenticated user only
// System-generated notifications should use db.notification.create directly
// or the /api/admin/notifications/broadcast endpoint.
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const body = await request.json();
    const { type, title, message, amount, actionUrl, targetUserId } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 },
      );
    }

    // Security: If targetUserId is provided, only allow admins to create notifications for other users.
    // Regular users can only create notifications for themselves.
    let recipientId = userId;

    if (targetUserId && targetUserId !== userId) {
      // Verify admin role
      const adminResult = await requireAdmin();
      if (adminResult instanceof NextResponse) {
        return NextResponse.json(
          { error: 'You can only create notifications for yourself' },
          { status: 403 },
        );
      }
      recipientId = targetUserId;
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 },
      );
    }

    const notification = await db.notification.create({
      data: {
        userId: recipientId,
        type: type || 'system',
        title,
        message,
        amount: amount ?? null,
        actionUrl: actionUrl ?? null,
      },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Notification POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 },
    );
  }
}
