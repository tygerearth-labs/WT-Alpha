import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action') || '';

    const where: Record<string, unknown> = {};
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      db.adminActivityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.adminActivityLog.count({ where })
    ]);

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Activity log error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

// DELETE /api/admin/activity-log — Clear all activity logs
export async function DELETE() {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const result = await db.adminActivityLog.deleteMany({});
    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error('Activity log DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to clear activity logs' },
      { status: 500 }
    );
  }
}
