import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

/**
 * Internal API — Verify admin role.
 * Used by middleware to check if the current user is an admin.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

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
