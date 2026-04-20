import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        image: true,
        locale: true,
        currency: true,
        plan: true,
        role: true,
        status: true,
        subscriptionEnd: true,
        maxCategories: true,
        maxSavings: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check subscription expiry
    if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
      await db.user.update({
        where: { id: userId },
        data: { plan: 'basic', subscriptionEnd: null }
      });
      user.plan = 'basic';
      user.subscriptionEnd = null;
    }

    return NextResponse.json({ user });

  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
