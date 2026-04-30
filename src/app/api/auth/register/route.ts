import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';

// In-memory rate limiter: max 3 registrations per IP per hour
const registrationAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_REGISTRATIONS = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of registrationAttempts.entries()) {
    if (now - record.firstAttempt > WINDOW_MS) {
      registrationAttempts.delete(ip);
    }
  }
}, 10 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const now = Date.now();
    const attemptRecord = registrationAttempts.get(clientIp);

    if (attemptRecord) {
      if (now - attemptRecord.firstAttempt > WINDOW_MS) {
        registrationAttempts.set(clientIp, { count: 1, firstAttempt: now });
      } else if (attemptRecord.count >= MAX_REGISTRATIONS) {
        return NextResponse.json(
          { error: 'Too many registration attempts. Please try again later.' },
          { status: 429 }
        );
      } else {
        attemptRecord.count++;
      }
    } else {
      registrationAttempts.set(clientIp, { count: 1, firstAttempt: now });
    }

    const body = await request.json();
    const { email, username, password, inviteToken } = body;

    // Check if registration is open (but allow invite tokens to bypass)
    let config = await db.platformConfig.findUnique({ where: { id: 'platform' } });
    if (config && !config.registrationOpen && !inviteToken) {
      return NextResponse.json(
        { error: config.registrationMessage || 'Registration is currently closed. Please contact the administrator.', registrationClosed: true },
        { status: 403 }
      );
    }

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate username length
    if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 30) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 30 characters' },
        { status: 400 }
      );
    }

    // Validate username characters (alphanumeric, underscore, hyphen only)
    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, underscores, and hyphens' },
        { status: 400 }
      );
    }

    // Validate password length (bcrypt DoS prevention)
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: 'Password must be between 8 and 128 characters' },
        { status: 400 }
      );
    }

    // Check invite token if provided
    let assignedPlan = config?.defaultPlan || 'basic';
    if (inviteToken) {
      // Use a transaction to atomically check and update the invite token (prevent race condition)
      const tokenResult = await db.$transaction(async (tx) => {
        const token = await tx.inviteToken.findUnique({ where: { token: inviteToken } });

        if (!token) {
          throw new Error('INVALID_TOKEN');
        }

        if (token.isUsed) {
          throw new Error('TOKEN_USED');
        }

        if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
          throw new Error('TOKEN_EXPIRED');
        }

        if (token.email && token.email !== email) {
          throw new Error('EMAIL_MISMATCH');
        }

        if (token.usedCount >= token.maxUses) {
          throw new Error('TOKEN_LIMIT');
        }

        const newUsedCount = token.usedCount + 1;
        // Only mark as used when the last allowed use is consumed
        const shouldMarkUsed = newUsedCount >= token.maxUses;

        await tx.inviteToken.update({
          where: { id: token.id },
          data: {
            isUsed: shouldMarkUsed,
            usedCount: newUsedCount,
            usedBy: email
          }
        });

        return token;
      }).catch((error: Error) => {
        if (error.message === 'INVALID_TOKEN') {
          return 'INVALID_TOKEN';
        }
        if (error.message === 'TOKEN_USED') {
          return 'TOKEN_USED';
        }
        if (error.message === 'TOKEN_EXPIRED') {
          return 'TOKEN_EXPIRED';
        }
        if (error.message === 'EMAIL_MISMATCH') {
          return 'EMAIL_MISMATCH';
        }
        if (error.message === 'TOKEN_LIMIT') {
          return 'TOKEN_LIMIT';
        }
        throw error;
      });

      if (tokenResult === 'INVALID_TOKEN') {
        return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 });
      }
      if (tokenResult === 'TOKEN_USED') {
        return NextResponse.json({ error: 'Invite token already used' }, { status: 400 });
      }
      if (tokenResult === 'TOKEN_EXPIRED') {
        return NextResponse.json({ error: 'Invite token has expired' }, { status: 400 });
      }
      if (tokenResult === 'EMAIL_MISMATCH') {
        return NextResponse.json(
          { error: 'This invite is associated with a different email address' },
          { status: 400 }
        );
      }
      if (tokenResult === 'TOKEN_LIMIT') {
        return NextResponse.json({ error: 'Invite token usage limit reached' }, { status: 400 });
      }

      assignedPlan = typeof tokenResult === 'object' && tokenResult !== null ? tokenResult.plan : 'basic';
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email or username already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Set limits based on platform config (already fetched at top of function)
    if (!config) {
      config = await db.platformConfig.create({ data: { id: 'platform' } });
    }

    const planMultiplier = assignedPlan === 'ultimate' ? 10 : assignedPlan === 'pro' ? 5 : 1;

    const user = await db.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        plan: assignedPlan,
        maxCategories: config.defaultMaxCategories * planMultiplier,
        maxSavings: config.defaultMaxSavings * planMultiplier,
      },
    });

    // After user creation, check for trial if no invite token was used
    if (!inviteToken) {
      if (config?.trialEnabled) {
        const trialEnd = new Date(Date.now() + (config.trialDurationDays || 30) * 24 * 60 * 60 * 1000);
        await db.user.update({
          where: { id: user.id },
          data: {
            plan: config.trialPlan || 'basic',
            subscriptionEnd: trialEnd,
            maxCategories: config.defaultMaxCategories * ((config.trialPlan === 'ultimate') ? 10 : (config.trialPlan === 'pro') ? 5 : 1),
            maxSavings: config.defaultMaxSavings * ((config.trialPlan === 'ultimate') ? 10 : (config.trialPlan === 'pro') ? 5 : 1),
          }
        });
      }
    }

    // Create default categories
    await db.category.createMany({
      data: [
        { name: 'Gaji', type: 'income', color: '#10b981', icon: 'Wallet', userId: user.id },
        { name: 'Bonus', type: 'income', color: '#f59e0b', icon: 'Gift', userId: user.id },
        { name: 'Investasi', type: 'income', color: '#8b5cf6', icon: 'TrendingUp', userId: user.id },
        { name: 'Lainnya', type: 'income', color: '#6b7280', icon: 'Package', userId: user.id },
        { name: 'Makanan', type: 'expense', color: '#ef4444', icon: 'UtensilsCrossed', userId: user.id },
        { name: 'Transportasi', type: 'expense', color: '#f97316', icon: 'Car', userId: user.id },
        { name: 'Belanja', type: 'expense', color: '#ec4899', icon: 'ShoppingBag', userId: user.id },
        { name: 'Tagihan', type: 'expense', color: '#3b82f6', icon: 'FileText', userId: user.id },
        { name: 'Hiburan', type: 'expense', color: '#14b8a6', icon: 'Gamepad', userId: user.id },
        { name: 'Kesehatan', type: 'expense', color: '#22c55e', icon: 'Pill', userId: user.id },
        { name: 'Pendidikan', type: 'expense', color: '#a855f7', icon: 'BookOpen', userId: user.id },
        { name: 'Lainnya', type: 'expense', color: '#6b7280', icon: 'Package', userId: user.id },
      ]
    });

    // Use signed session cookie
    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        image: user.image,
        plan: user.plan,
        role: user.role
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
