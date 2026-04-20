import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { notifyTransaction } from '@/lib/notificationHelpers';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

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
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const body = await request.json();
    const { type, amount, description, categoryId, date, targetId, allocationPercentage } = body;

    if (!type || !amount) {
      return NextResponse.json(
        { error: 'Type and amount are required' },
        { status: 400 }
      );
    }

    // Ensure numeric types are properly parsed
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const numAllocationPct = allocationPercentage != null ? parseFloat(allocationPercentage) : 0;

    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }
    if (isNaN(numAllocationPct)) {
      return NextResponse.json(
        { error: 'Invalid allocation percentage' },
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
      const defaultCategoryIcon = type === 'income' ? 'Landmark' : 'Send';

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
    let targetSavingsId: string | null = null;
    let allocationAmount = 0;
    let allocationPct = 0;

    if (type === 'income' && targetId && numAllocationPct > 0) {
      targetSavingsId = targetId;
      allocationPct = numAllocationPct;
      allocationAmount = (numAmount * numAllocationPct) / 100;

      // Validate target exists BEFORE creating transaction (atomic approach)
      if (allocationAmount > 0 && targetSavingsId) {
        const savingsTarget = await db.savingsTarget.findFirst({
          where: { id: targetSavingsId, userId },
        });
        if (!savingsTarget) {
          return NextResponse.json(
            { error: 'Savings target not found' },
            { status: 404 }
          );
        }
        if (allocationPct < 0 || allocationPct > 100) {
          return NextResponse.json(
            { error: 'Allocation percentage must be between 0 and 100' },
            { status: 400 }
          );
        }
      }
    }

    // Create transaction AND update savings target atomically
    let transaction;

    if (targetSavingsId && allocationAmount > 0) {
      // Wrap both operations in a transaction for atomicity
      const result = await db.$transaction([
        db.transaction.create({
          data: {
            type,
            amount: numAmount,
            description,
            categoryId: category.id,
            userId,
            date: date ? new Date(date) : new Date(),
            allocation: {
              create: {
                targetId: targetSavingsId,
                userId,
                amount: allocationAmount,
                percentage: allocationPct,
              },
            },
          },
          include: {
            category: true,
            allocation: true,
          },
        }),
        db.savingsTarget.update({
          where: { id: targetSavingsId },
          data: { currentAmount: { increment: allocationAmount } },
        }),
      ]);
      transaction = result[0];
    } else {
      transaction = await db.transaction.create({
        data: {
          type,
          amount: numAmount,
          description,
          categoryId: category.id,
          userId,
          date: date ? new Date(date) : new Date(),
        },
        include: {
          category: true,
          allocation: true,
        },
      });
    }

    // Create notification for the transaction (non-blocking)
    notifyTransaction(userId, type, numAmount, description, category.id).catch(() => {});

    return NextResponse.json({ transaction }, { status: 201 });

  } catch (error) {
    console.error('Transaction POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
