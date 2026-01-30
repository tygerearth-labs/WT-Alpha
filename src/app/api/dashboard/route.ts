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
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Get transactions with date filter
    const whereClause: any = { userId };
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

    // Calculate totals
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    // Get savings targets
    const savingsTargets = await db.savingsTarget.findMany({
      where: { userId },
      include: {
        allocations: true,
      },
      orderBy: {
        targetDate: 'asc',
      },
    });

    // Calculate total savings from both savings targets and net balance
    const savingsFromTargets = savingsTargets.reduce((sum, t) => sum + t.currentAmount, 0);
    const netBalance = totalIncome - totalExpense;
    const totalSavings = Math.max(savingsFromTargets, netBalance, 0);

    // Get transactions by category
    const transactionsByCategory = await db.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'expense',
        ...(month && year ? {
          date: {
            gte: new Date(parseInt(year), parseInt(month) - 1, 1),
            lt: new Date(parseInt(year), parseInt(month), 1),
          },
        } : {}),
      },
      _sum: {
        amount: true,
      },
    });

    // Get category details
    const categories = await db.category.findMany({
      where: {
        id: { in: transactionsByCategory.map((t) => t.categoryId) },
        type: 'expense',
      },
    });

    const expenseByCategory = transactionsByCategory.map((t) => {
      const category = categories.find((c) => c.id === t.categoryId);
      return {
        category: category?.name || 'Lainnya',
        amount: t._sum.amount || 0,
        color: category?.color || '#6b7280',
        icon: category?.icon || '📦',
      };
    }).sort((a, b) => b.amount - a.amount);

    // Calculate debt ratio (if any savings targets have initial investment)
    const totalDebt = 0; // Can be calculated from transactions if needed
    const debtRatio = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;

    return NextResponse.json({
      totalIncome,
      totalExpense,
      balance,
      totalSavings,
      debtRatio,
      savingsTargets,
      transactions,
      expenseByCategory,
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
