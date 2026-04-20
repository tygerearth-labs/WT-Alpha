import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logAdminActivity } from '@/lib/adminLogger';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const adminId = auth;

  try {
    const { id } = await params;

    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, message, type, isActive, priority, startsAt, expiresAt } = body;

    const validTypes = ['info', 'warning', 'success', 'maintenance'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const announcement = await db.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(message !== undefined && { message }),
        ...(type !== undefined && { type }),
        ...(isActive !== undefined && { isActive }),
        ...(priority !== undefined && { priority: typeof priority === 'number' ? priority : 0 }),
        ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });

    const changes: string[] = [];
    if (title !== undefined && title !== existing.title) changes.push(`title: "${existing.title}" → "${title}"`);
    if (type !== undefined && type !== existing.type) changes.push(`type: ${existing.type} → ${type}`);
    if (isActive !== undefined && isActive !== existing.isActive) changes.push(`active: ${existing.isActive} → ${isActive}`);
    if (priority !== undefined && priority !== existing.priority) changes.push(`priority: ${existing.priority} → ${priority}`);

    await logAdminActivity(
      adminId,
      'update_announcement',
      id,
      `Updated announcement: "${existing.title}"${changes.length ? ` (${changes.join(', ')})` : ''}`
    );

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error('Failed to update announcement:', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const adminId = auth;

  try {
    const { id } = await params;

    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    await db.announcement.delete({ where: { id } });

    await logAdminActivity(adminId, 'delete_announcement', id, `Deleted announcement: "${existing.title}"`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete announcement:', error);
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}
