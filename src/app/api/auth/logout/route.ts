import { NextResponse } from 'next/server';
import { SESSION_COOKIE_OPTIONS } from '@/lib/session';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.set('session', '', {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
