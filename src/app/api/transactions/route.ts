import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'income' or 'expense'
    const categoryId = searchParams.get('categoryId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Validate month/year query params if provided
    if (month || year) {
      const parsedMonth = month ? parseInt(month) : NaN;
      const parsedYear = year ? parseInt(year) : NaN;
      if ((month && isNaN(parsedMonth)) || (year && isNaN(parsedYear)) ||
          (month && (parsedMonth < 1 || parsedMonth > 12))) {
        return NextResponse.json({ error: 'Invalid month/year parameters' }, { status: 400 });
      }
    }

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
    const session = await getSession();
    const userId = session.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, amount, description, categoryId, date, targetId, allocationPercentage } = body;

    if (!type || !amount) {
      return NextResponse.json(
        { error: 'Type and amount are required' },
        { status: 400 }
      );
    }

    // Validate transaction type
    if (!['income', 'expense'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "income" or "expense"' },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Handle category - find or create default category if not provided
    let category;
    if (categoryId && categoryId !== 'none') {
      // Verify category belongs to user
      category = await db.category.findFirst({
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
    } else {
      // Find or create default category for quick deposits
      const defaultCategoryName = type === 'income' ? 'Setoran Cepat' : 'Pengeluaran Lainnya';
      const defaultCategoryColor = type === 'income' ? '#10b981' : '#ef4444';
      const defaultCategoryIcon = type === 'income' ? '💰' : '📤';

      category = await db.category.findFirst({
        where: {
          name: defaultCategoryName,
          type,
          userId,
        },
      });

      if (!category) {
        category = await db.category.create({
          data: {
            name: defaultCategoryName,
            type,
            color: defaultCategoryColor,
            icon: defaultCategoryIcon,
            userId,
          },
        });
      }
    }

    // Handle allocation to savings target
    let targetSavingsId = null;
    let allocationAmount = 0;
    let allocationPct = 0;

    if (type === 'income' && targetId && allocationPercentage) {
      targetSavingsId = targetId;
      allocationPct = allocationPercentage;
      allocationAmount = (amount * allocationPercentage) / 100;
    }

    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        type,
        amount,
        description,
        categoryId: category.id,
        userId,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        category: true,
      },
    });

    // If allocated to savings target, create allocation record and update target
    if (targetSavingsId && allocationAmount > 0) {
      // Verify target belongs to user
      const savingsTarget = await db.savingsTarget.findFirst({
        where: {
          id: targetSavingsId,
          userId,
        },
      });

      if (!savingsTarget) {
        return NextResponse.json(
          { error: 'Savings target not found' },
          { status: 404 }
        );
      }

      // Create allocation record
      await db.allocation.create({
        data: {
          transactionId: transaction.id,
          targetId: targetSavingsId,
          userId,
          amount: allocationAmount,
          percentage: allocationPct,
        },
      });

      // Update savings target current amount
      await db.savingsTarget.update({
        where: {
          id: targetSavingsId,
        },
        data: {
          currentAmount: {
            increment: allocationAmount,
          },
        },
      });
    }

    return NextResponse.json({ transaction }, { status: 201 });

  } catch (error) {
    console.error('Transaction POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
