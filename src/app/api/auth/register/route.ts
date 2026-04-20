import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password, inviteToken } = body;

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    // Check invite token if provided
    let assignedPlan = 'basic';
    if (inviteToken) {
      const token = await db.inviteToken.findUnique({ where: { token: inviteToken } });

      if (!token) {
        return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 });
      }

      if (token.isUsed) {
        return NextResponse.json({ error: 'Invite token already used' }, { status: 400 });
      }

      if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Invite token has expired' }, { status: 400 });
      }

      if (token.email && token.email !== email) {
        return NextResponse.json(
          { error: `This invite is for ${token.email} only` },
          { status: 400 }
        );
      }

      if (token.usedCount >= token.maxUses) {
        return NextResponse.json({ error: 'Invite token usage limit reached' }, { status: 400 });
      }

      assignedPlan = token.plan;

      // Mark token as used
      await db.inviteToken.update({
        where: { id: token.id },
        data: {
          isUsed: true,
          usedCount: token.usedCount + 1,
          usedBy: email
        }
      });
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

    const userData: Record<string, unknown> = {
      email,
      username,
      password: hashedPassword,
      plan: assignedPlan
    };

    // Set limits based on platform config
    let config = await db.platformConfig.findUnique({ where: { id: 'platform' } });
    if (!config) {
      config = await db.platformConfig.create({ data: { id: 'platform' } });
    }

    if (assignedPlan === 'pro') {
      userData.maxCategories = config.defaultMaxCategories * 5; // Pro gets 5x basic limits
      userData.maxSavings = config.defaultMaxSavings * 5;
    } else {
      userData.maxCategories = config.defaultMaxCategories;
      userData.maxSavings = config.defaultMaxSavings;
    }

    const user = await db.user.create({ data: userData as any });

    // Create default categories
    await db.category.createMany({
      data: [
        { name: 'Gaji', type: 'income', color: '#10b981', icon: 'Wallet', userId: user.id },
        { name: 'Bonus', type: 'income', color: '#f59e0b', icon: 'Gift', userId: user.id },
        { name: 'Investasi', type: 'income', color: '#8b5cf6', icon: 'TrendingUp', userId: user.id },
        { name: 'Lainnya', type: 'income', color: '#6b7280', icon: 'Package', userId: user.id },
        { name: 'Makanan', type: 'expense', color: '#ef4444', icon: 'UtensilsCrossed', userId: user.id },
        { name: 'Transportasi', type: 'expense', color: '#f97316', icon: 'Car', userId: user.id },
        { name: 'Belanja', type: 'expense', color: '#ec4899', icon: 'ShoppingCart', userId: user.id },
        { name: 'Tagihan', type: 'expense', color: '#3b82f6', icon: 'FileText', userId: user.id },
        { name: 'Hiburan', type: 'expense', color: '#14b8a6', icon: 'Clapperboard', userId: user.id },
        { name: 'Kesehatan', type: 'expense', color: '#22c55e', icon: 'Pill', userId: user.id },
        { name: 'Pendidikan', type: 'expense', color: '#a855f7', icon: 'BookOpen', userId: user.id },
        { name: 'Lainnya', type: 'expense', color: '#6b7280', icon: 'Package', userId: user.id },
      ]
    });

    const cookieStore = await cookies();
    cookieStore.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

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
