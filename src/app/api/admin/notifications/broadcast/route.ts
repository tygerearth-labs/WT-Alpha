import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// POST /api/admin/notifications/broadcast — Send a broadcast notification to all users or users of a specific plan
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { title, message, plan } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 },
      );
    }

    if (plan && !['basic', 'pro'].includes(plan)) {
      return NextResponse.json(
        { error: 'Plan must be "basic" or "pro"' },
        { status: 400 },
      );
    }

    // Find target users
    const whereClause: Record<string, unknown> = { status: 'active' };
    if (plan) {
      whereClause.plan = plan;
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No active users found for the specified criteria' },
        { status: 404 },
      );
    }

    // Create a notification for each matching user
    const notifications = await db.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: 'broadcast',
        title,
        message,
      })),
    });

    return NextResponse.json({
      sent: notifications.count,
      plan: plan || 'all',
    });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send broadcast notification' },
      { status: 500 },
    );
  }
}
