import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
