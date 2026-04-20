import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * Get the authenticated user's ID from the session cookie.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('userId')?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Require authentication — returns userId or a 401 response.
 * Use at the top of every protected API route.
 */
export async function requireAuth(): Promise<string | NextResponse> {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return userId;
}

/**
 * Require admin role — returns userId or a 403 response.
 * Use at the top of every admin API route.
 */
export async function requireAdmin(): Promise<string | NextResponse> {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true }
  });

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  if (user.status === 'suspended') {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
  }

  return userId;
}
