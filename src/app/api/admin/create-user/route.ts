import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logAdminActivity } from '@/lib/adminLogger';

// POST /api/admin/create-user — Create a user directly from admin panel
export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const body = await request.json();
    const { email, username, password, plan } = body;

    // Validate required fields
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate username (min 3 chars)
    if (typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Validate password (min 6 chars)
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate plan if provided
    const userPlan = plan === 'pro' ? 'pro' : 'basic';

    // Check email uniqueness
    const existingEmail = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Set defaults based on plan
    const maxCategories = userPlan === 'pro' ? 50 : 10;
    const maxSavings = userPlan === 'pro' ? 20 : 3;

    // Create user
    const newUser = await db.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.trim(),
        password: hashedPassword,
        plan: userPlan,
        role: 'user',
        status: 'active',
        maxCategories,
        maxSavings
      },
      select: {
        id: true,
        email: true,
        username: true,
        plan: true,
        role: true,
        status: true,
        maxCategories: true,
        maxSavings: true,
        createdAt: true
      }
    });

    // Log admin activity
    logAdminActivity(adminId as string, 'create_user', email, 'Created user via admin panel');

    return NextResponse.json(
      { message: 'User created successfully', user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
