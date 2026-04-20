import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logAdminActivity } from '@/lib/adminLogger';

// GET /api/admin/users — List all users with filters
export async function GET(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: Record<string, unknown> = { role: 'user' };

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { username: { contains: search } },
        { id: { contains: search } }
      ];
    }
    if (plan) where.plan = plan;
    if (status) where.status = status;

    const orderBy: Record<string, string> = {};
    if (['createdAt', 'updatedAt', 'username', 'email', 'plan'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, image: true,
          plan: true, status: true, locale: true, currency: true,
          subscriptionEnd: true, maxCategories: true, maxSavings: true,
          createdAt: true, updatedAt: true,
          _count: { select: { transactions: true, categories: true, savingsTargets: true } }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      db.user.count({ where })
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PUT /api/admin/users — Update user (plan, status, limits, role)
export async function PUT(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const body = await request.json();
    const { userId, plan, status, maxCategories, maxSavings, subscriptionEnd, role } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (existingUser.role === 'admin' && userId !== adminId) {
      return NextResponse.json({ error: 'Cannot modify other admin users' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    const changes: string[] = [];

    if (plan !== undefined) {
      updateData.plan = plan;
      changes.push(`Plan: ${plan}`);
    }
    if (status !== undefined) {
      updateData.status = status;
      changes.push(`Status: ${status}`);
    }
    if (maxCategories !== undefined) {
      updateData.maxCategories = maxCategories;
      changes.push(`MaxCategories: ${maxCategories}`);
    }
    if (maxSavings !== undefined) {
      updateData.maxSavings = maxSavings;
      changes.push(`MaxSavings: ${maxSavings}`);
    }
    if (subscriptionEnd !== undefined) {
      updateData.subscriptionEnd = subscriptionEnd ? new Date(subscriptionEnd) : null;
      changes.push(`SubscriptionEnd: ${subscriptionEnd || 'none'}`);
    }

    // Role change support (promote/demote admin)
    if (role !== undefined) {
      if (role !== 'admin' && role !== 'user') {
        return NextResponse.json({ error: 'Role must be "admin" or "user"' }, { status: 400 });
      }
      if (existingUser.email === 'admin@wealthtracker.com') {
        return NextResponse.json(
          { error: 'Cannot change role of the primary admin account' },
          { status: 403 }
        );
      }
      updateData.role = role;
      changes.push(`Role: ${existingUser.role} → ${role}`);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, email: true, username: true, plan: true, status: true,
        subscriptionEnd: true, maxCategories: true, maxSavings: true,
        createdAt: true, updatedAt: true
      }
    });

    const details = changes.join(', ');
    const actionType = role !== undefined ? 'change_role' : 'update_user';
    logAdminActivity(adminId as string, actionType, updatedUser.email, details);

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/admin/users — Delete user
export async function DELETE(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (existingUser.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 });
    }

    const userEmail = existingUser.email;
    await db.user.delete({ where: { id: userId } });
    logAdminActivity(adminId as string, 'delete_user', userEmail);
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

// POST /api/admin/users/reset-password — Reset user password
export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const body = await request.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'User ID and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (existingUser.role === 'admin') {
      return NextResponse.json({ error: 'Cannot reset admin password' }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    logAdminActivity(adminId as string, 'reset_password', existingUser.email);
    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Admin reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
