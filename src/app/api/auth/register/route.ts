import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { registerSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, username, password } = result.data;
    const { locale } = body;

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email or username already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        locale: locale === 'en' ? 'en' : 'id',
      }
    });

    // Create default categories with Lucide icons (localized)
    const userLocale = locale === 'en' ? 'en' : 'id';
    const defaultCategories = userLocale === 'en' ? [
      { name: 'Salary', type: 'income', color: '#10b981', icon: 'Wallet' },
      { name: 'Bonus', type: 'income', color: '#f59e0b', icon: 'Gift' },
      { name: 'Investment', type: 'income', color: '#8b5cf6', icon: 'TrendingUp' },
      { name: 'Other', type: 'income', color: '#6b7280', icon: 'Package' },
      { name: 'Food', type: 'expense', color: '#ef4444', icon: 'UtensilsCrossed' },
      { name: 'Transport', type: 'expense', color: '#f97316', icon: 'Car' },
      { name: 'Shopping', type: 'expense', color: '#ec4899', icon: 'ShoppingBag' },
      { name: 'Bills', type: 'expense', color: '#3b82f6', icon: 'FileText' },
      { name: 'Entertainment', type: 'expense', color: '#14b8a6', icon: 'Film' },
      { name: 'Health', type: 'expense', color: '#22c55e', icon: 'Pill' },
      { name: 'Education', type: 'expense', color: '#a855f7', icon: 'GraduationCap' },
      { name: 'Other', type: 'expense', color: '#6b7280', icon: 'Package' },
    ] : [
      { name: 'Gaji', type: 'income', color: '#10b981', icon: 'Wallet' },
      { name: 'Bonus', type: 'income', color: '#f59e0b', icon: 'Gift' },
      { name: 'Investasi', type: 'income', color: '#8b5cf6', icon: 'TrendingUp' },
      { name: 'Lainnya', type: 'income', color: '#6b7280', icon: 'Package' },
      { name: 'Makanan', type: 'expense', color: '#ef4444', icon: 'UtensilsCrossed' },
      { name: 'Transportasi', type: 'expense', color: '#f97316', icon: 'Car' },
      { name: 'Belanja', type: 'expense', color: '#ec4899', icon: 'ShoppingBag' },
      { name: 'Tagihan', type: 'expense', color: '#3b82f6', icon: 'FileText' },
      { name: 'Hiburan', type: 'expense', color: '#14b8a6', icon: 'Film' },
      { name: 'Kesehatan', type: 'expense', color: '#22c55e', icon: 'Pill' },
      { name: 'Pendidikan', type: 'expense', color: '#a855f7', icon: 'GraduationCap' },
      { name: 'Lainnya', type: 'expense', color: '#6b7280', icon: 'Package' },
    ];

    await db.category.createMany({
      data: defaultCategories.map(cat => ({ ...cat, userId: user.id })),
    });

    // Set session
    const session = await getSession();
    session.userId = user.id;
    await session.save();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        image: user.image,
        plan: user.plan
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
