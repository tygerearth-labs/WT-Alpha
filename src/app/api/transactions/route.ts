import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'income' or 'expense'
    const categoryId = searchParams.get('categoryId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const whereClause: any = { userId };
    if (type) whereClause.type = type;
    if (categoryId) whereClause.categoryId = categoryId;
    if (month && year) {
      whereClause.date = {
        gte: new Date(parseInt(year), parseInt(month) - 1, 1),
        lt: new Date(parseInt(year), parseInt(month), 1),
      };
    }

    const transactions = await db.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({ transactions });

  } catch (error) {
    console.error('Transactions GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, amount, description, categoryId, date } = body;

    if (!type || !amount || !categoryId) {
      return NextResponse.json(
        { error: 'Type, amount, and categoryId are required' },
        { status: 400 }
      );
    }

    // Verify category belongs to user
    const category = await db.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const transaction = await db.transaction.create({
      data: {
        type,
        amount,
        description,
        categoryId,
        userId,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });

  } catch (error) {
    console.error('Transaction POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
