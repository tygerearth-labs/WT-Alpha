import { cookies } from 'next/headers';
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
 *
 * @example
 * ```ts
 * const userId = await requireAuth();
 * if (!userId) return; // sends 401
 * ```
 */
export async function requireAuth(): Promise<string | NextResponse> {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return userId;
}
