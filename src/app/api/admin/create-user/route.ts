import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logAdminActivity } from '@/lib/adminLogger';

/**
 * Validate that an image URL is safe (no javascript: URIs or other dangerous schemes).
 * Allows http://, https://, and relative paths starting with /.
 */
function isValidImageUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  // Reject dangerous schemes
  if (trimmed.startsWith('javascript:')) return false;
  if (trimmed.startsWith('data:')) return false;
  if (trimmed.startsWith('vbscript:')) return false;
  if (trimmed.startsWith('file:')) return false;
  // Allow valid schemes
  if (trimmed.startsWith('https://')) return true;
  if (trimmed.startsWith('http://')) return true;
  if (trimmed.startsWith('/')) return true;
  // Reject anything else
  return false;
}

// POST /api/admin/create-user — Create a user directly from admin panel
export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const body = await request.json();
    const { email, username, password, plan, role, image } = body;

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

    // Validate password (min 8 chars)
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Validate role if provided (only admin can set roles)
    const validRoles = ['user', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'user';

    // Validate plan if provided
    const validPlans = ['basic', 'pro', 'ultimate'];
    const userPlan = validPlans.includes(plan) ? plan : 'basic';

    // Validate image URL if provided
    if (image !== undefined && image !== null && image.trim() !== '') {
      if (!isValidImageUrl(image)) {
        return NextResponse.json(
          { error: 'Invalid image URL. Only http://, https://, and relative paths are allowed.' },
          { status: 400 }
        );
      }
    }

    // Check email uniqueness
    const existingEmail = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Read platform config for limits
    const platformConfig = await db.platformConfig.findUnique({ where: { id: 'platform' } });
    const baseCategories = platformConfig?.defaultMaxCategories || 10;
    const baseSavings = platformConfig?.defaultMaxSavings || 3;
    const planMultiplier = userPlan === 'ultimate' ? 10 : userPlan === 'pro' ? 5 : 1;
    const maxCategories = baseCategories * planMultiplier;
    const maxSavings = baseSavings * planMultiplier;

    // Create user
    const newUser = await db.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.trim(),
        password: hashedPassword,
        plan: userPlan,
        role: userRole,
        status: 'active',
        maxCategories,
        maxSavings,
        ...(image && image.trim() !== '' ? { image: image.trim() } : {}),
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

    // Create default categories for the new user
    await db.category.createMany({
      data: [
        { name: 'Gaji', type: 'income', color: '#10b981', icon: 'Wallet', userId: newUser.id },
        { name: 'Bonus', type: 'income', color: '#f59e0b', icon: 'Gift', userId: newUser.id },
        { name: 'Investasi', type: 'income', color: '#8b5cf6', icon: 'TrendingUp', userId: newUser.id },
        { name: 'Lainnya', type: 'income', color: '#6b7280', icon: 'Package', userId: newUser.id },
        { name: 'Makanan', type: 'expense', color: '#ef4444', icon: 'UtensilsCrossed', userId: newUser.id },
        { name: 'Transportasi', type: 'expense', color: '#f97316', icon: 'Car', userId: newUser.id },
        { name: 'Belanja', type: 'expense', color: '#ec4899', icon: 'ShoppingCart', userId: newUser.id },
        { name: 'Tagihan', type: 'expense', color: '#3b82f6', icon: 'FileText', userId: newUser.id },
        { name: 'Hiburan', type: 'expense', color: '#14b8a6', icon: 'Clapperboard', userId: newUser.id },
        { name: 'Kesehatan', type: 'expense', color: '#22c55e', icon: 'Pill', userId: newUser.id },
        { name: 'Pendidikan', type: 'expense', color: '#a855f7', icon: 'BookOpen', userId: newUser.id },
        { name: 'Lainnya', type: 'expense', color: '#6b7280', icon: 'Package', userId: newUser.id },
      ]
    });

    // Log admin activity
    await logAdminActivity(adminId as string, 'create_user', email, 'Created user via admin panel');

    return NextResponse.json(
      { message: 'User created successfully', user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
