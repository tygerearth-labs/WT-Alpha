import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAdminActivity } from '@/lib/adminLogger';

// GET /api/admin/subscriptions — List subscription info
export async function GET(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const plan = searchParams.get('plan') || '';

    const where: Record<string, unknown> = {
      role: 'user',
    };

    if (plan) where.plan = plan;
    // Don't filter by status - show all users including suspended

    const [subscriptions, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, plan: true,
          subscriptionEnd: true, createdAt: true, status: true
        },
        orderBy: [{ subscriptionEnd: { sort: 'asc', nulls: 'last' } }],
        skip: (page - 1) * limit,
        take: limit
      }),
      db.user.count({ where })
    ]);

    // Mark expired ones
    const now = new Date();
    const enriched = subscriptions.map((sub: any) => ({
      ...sub,
      isExpired: sub.subscriptionEnd && new Date(sub.subscriptionEnd) < now,
      daysRemaining: sub.subscriptionEnd
        ? Math.ceil((new Date(sub.subscriptionEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null
    }));

    return NextResponse.json({
      subscriptions: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

// POST /api/admin/subscriptions — Extend/assign subscription
export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const body = await request.json();
    const { userId, plan, durationDays } = body;

    if (!userId || !plan || !durationDays) {
      return NextResponse.json({ error: 'User ID, plan, and duration are required' }, { status: 400 });
    }

    if (!['basic', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'Plan must be "basic" or "pro"' }, { status: 400 });
    }
    const numDurationDays = typeof durationDays === 'string' ? parseInt(durationDays) : durationDays;
    if (isNaN(numDurationDays) || numDurationDays <= 0 || numDurationDays > 3650) {
      return NextResponse.json({ error: 'Duration must be between 1 and 3650 days' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (existingUser.role === 'admin') {
      return NextResponse.json({ error: 'Cannot modify admin subscription' }, { status: 403 });
    }

    const startDate = existingUser.subscriptionEnd && new Date(existingUser.subscriptionEnd) > new Date()
      ? new Date(existingUser.subscriptionEnd)
      : new Date();
    const newEnd = new Date(startDate.getTime() + numDurationDays * 24 * 60 * 60 * 1000);

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        plan,
        subscriptionEnd: newEnd,
        status: 'active'
      },
      select: { id: true, email: true, username: true, plan: true, subscriptionEnd: true }
    });

    logAdminActivity(adminId as string, 'assign_subscription', updatedUser.email, `Plan: ${plan}, Duration: ${numDurationDays} days, NewEnd: ${newEnd.toISOString()}`);
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Admin subscription update error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
