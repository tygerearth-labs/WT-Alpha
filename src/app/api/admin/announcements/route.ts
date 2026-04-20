import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logAdminActivity } from '@/lib/adminLogger';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const adminId = auth;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const now = new Date();

    const where: Record<string, unknown> = {};

    if (status === 'active') {
      Object.assign(where, {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      });
    } else if (status === 'scheduled') {
      Object.assign(where, {
        isActive: true,
        startsAt: { gt: now },
      });
    } else if (status === 'expired') {
      Object.assign(where, {
        isActive: true,
        expiresAt: { lte: now },
        startsAt: { lte: now },
      });
    } else if (status === 'inactive') {
      Object.assign(where, { isActive: false });
    }

    if (type) {
      where.type = type;
    }

    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.announcement.count({ where }),
    ]);

    return NextResponse.json({
      announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const adminId = auth;

  try {
    const body = await request.json();
    const { title, message, type = 'info', isActive = true, priority = 0, startsAt, expiresAt } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const validTypes = ['info', 'warning', 'success', 'maintenance'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be: info, warning, success, or maintenance' }, { status: 400 });
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        message,
        type,
        isActive,
        priority: typeof priority === 'number' ? priority : 0,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    await logAdminActivity(adminId, 'create_announcement', announcement.id, `Created announcement: "${title}"`);

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error('Failed to create announcement:', error);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}
