import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';
import { notifySubscriptionExpiry, notifyUpgradeOffer } from '@/lib/notificationHelpers';

// In-memory rate limiter: max 5 attempts per email per 15 minutes
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of loginAttempts.entries()) {
    if (now - record.firstAttempt > WINDOW_MS) {
      loginAttempts.delete(email);
    }
  }
}, 10 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Ensure password is a string (bcrypt.compare requires strings)
    const passwordStr = typeof password === 'string' ? password : String(password);

    // Rate limiting check
    const now = Date.now();
    const attemptRecord = loginAttempts.get(email);

    if (attemptRecord) {
      // Check if window has expired
      if (now - attemptRecord.firstAttempt > WINDOW_MS) {
        // Reset the window
        loginAttempts.set(email, { count: 1, firstAttempt: now });
      } else if (attemptRecord.count >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: 'Too many login attempts. Please try again later.' },
          { status: 429 }
        );
      } else {
        attemptRecord.count++;
      }
    } else {
      loginAttempts.set(email, { count: 1, firstAttempt: now });
    }

    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(passwordStr, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Successful login — clear rate limit for this email
    loginAttempts.delete(email);

    if (user.status === 'suspended') {
      return NextResponse.json(
        { error: 'Account suspended. Please contact administrator.' },
        { status: 403 }
      );
    }

    if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
      // Auto downgrade expired subscriptions to basic
      await db.user.update({
        where: { id: user.id },
        data: { plan: 'basic', subscriptionEnd: null }
      });
      user.plan = 'basic';

      // Create notification about the downgrade
      notifySubscriptionExpiry(user.id, 0).catch(() => {});
    } else if (user.subscriptionEnd && user.plan !== 'basic') {
      // Check for expiring subscriptions (within 7 days)
      const nowDate = new Date();
      const daysLeft = Math.ceil(
        (new Date(user.subscriptionEnd).getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysLeft > 0 && daysLeft <= 7) {
        // Check if we already sent an expiry reminder recently (within last 24h)
        const recentReminder = await db.notification.findFirst({
          where: {
            userId: user.id,
            type: 'subscription',
            createdAt: { gte: new Date(nowDate.getTime() - 24 * 60 * 60 * 1000) },
          },
          select: { id: true },
        });

        if (!recentReminder) {
          notifySubscriptionExpiry(user.id, daysLeft).catch(() => {});
        }
      }
    } else if (user.plan === 'basic') {
      // Occasional upgrade offer for basic users (once per login session, max once per 7 days)
      const recentOffer = await db.notification.findFirst({
        where: {
          userId: user.id,
          type: 'upgrade',
          createdAt: { gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });

      if (!recentOffer) {
        notifyUpgradeOffer(user.id).catch(() => {});
      }
    }

    // Use signed session cookie
    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        image: user.image,
        plan: user.plan,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
