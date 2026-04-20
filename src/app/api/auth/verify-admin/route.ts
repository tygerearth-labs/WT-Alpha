import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

/**
 * Internal API — Verify admin role.
 * Used by middleware to check if the current user is an admin.
 */
export async function GET() {
  try {
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true }
    });

    if (!user || user.role !== 'admin' || user.status === 'suspended') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
