import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'income' or 'expense'

    const whereClause: any = { userId };
    if (type) whereClause.type = type;

    const categories = await db.category.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    return NextResponse.json({ categories });

  } catch (error) {
    console.error('Categories GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const body = await request.json();
    const { name, type, color, icon } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    if (!['income', 'expense'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be income or expense' },
        { status: 400 }
      );
    }

    // Validate name length
    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 50 characters' },
        { status: 400 }
      );
    }

    // Validate color format if provided
    if (color !== undefined && color !== null) {
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
      if (!hexColorRegex.test(color)) {
        return NextResponse.json(
          { error: 'Color must be a valid hex color (e.g., #10b981)' },
          { status: 400 }
        );
      }
    }

    // Enforce plan limit on categories
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { maxCategories: true },
    });

    if (user) {
      const count = await db.category.count({ where: { userId } });
      if (count >= user.maxCategories) {
        return NextResponse.json(
          { error: `Category limit (${user.maxCategories}) reached. Upgrade to Pro for more categories.`, code: 'LIMIT_REACHED' },
          { status: 403 },
        );
      }
    }

    const category = await db.category.create({
      data: {
        name,
        type,
        color: color || '#6b7280',
        icon: icon || 'Package',
        userId,
      },
    });

    return NextResponse.json({ category }, { status: 201 });

  } catch (error) {
    console.error('Category POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
