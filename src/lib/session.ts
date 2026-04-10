import { cookies } from 'next/headers';

/**
 * Session data stored in the userId cookie.
 */
export interface SessionData {
  userId: string;
}

/**
 * Create a session by setting the userId cookie.
 */
export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('userId', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Get the current session from cookies.
 * Returns null if not authenticated.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  if (!userId) return null;
  return { userId };
}

/**
 * Destroy the current session by clearing the cookie.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('userId', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}
