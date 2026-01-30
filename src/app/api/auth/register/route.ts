import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password } = body;

    // Validation
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

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
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      }
    });

    // Create default categories
    await db.category.createMany({
      data: [
        // Income categories
        { name: 'Gaji', type: 'income', color: '#10b981', icon: '💰', userId: user.id },
        { name: 'Bonus', type: 'income', color: '#f59e0b', icon: '🎁', userId: user.id },
        { name: 'Investasi', type: 'income', color: '#8b5cf6', icon: '📈', userId: user.id },
        { name: 'Lainnya', type: 'income', color: '#6b7280', icon: '📦', userId: user.id },
        // Expense categories
        { name: 'Makanan', type: 'expense', color: '#ef4444', icon: '🍔', userId: user.id },
        { name: 'Transportasi', type: 'expense', color: '#f97316', icon: '🚗', userId: user.id },
        { name: 'Belanja', type: 'expense', color: '#ec4899', icon: '🛒', userId: user.id },
        { name: 'Tagihan', type: 'expense', color: '#3b82f6', icon: '📄', userId: user.id },
        { name: 'Hiburan', type: 'expense', color: '#14b8a6', icon: '🎬', userId: user.id },
        { name: 'Kesehatan', type: 'expense', color: '#22c55e', icon: '💊', userId: user.id },
        { name: 'Pendidikan', type: 'expense', color: '#a855f7', icon: '📚', userId: user.id },
        { name: 'Lainnya', type: 'expense', color: '#6b7280', icon: '📦', userId: user.id },
      ]
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        image: user.image
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
