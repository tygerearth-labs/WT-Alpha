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

    // Calculate growth metrics for momentum
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all transactions for cumulative savings calculation
    const allTransactions = await db.transaction.findMany({
      where: {
        userId,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Calculate savings over time (last 30 days) - optimized
    const savingsHistory: Array<{ date: string; savings: number }> = [];
    let cumulativeIncome = 0;
    let cumulativeExpense = 0;

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);

      // Calculate savings for this day using all transactions
      let dayIncome = 0;
      let dayExpense = 0;

      for (const transaction of allTransactions) {
        const txDate = new Date(transaction.date);
        if (txDate >= dayStart && txDate <= dayEnd) {
          if (transaction.type === 'income') {
            dayIncome += transaction.amount;
          } else if (transaction.type === 'expense') {
            dayExpense += transaction.amount;
          }
        }
      }

      const daySavings = Math.max(dayIncome - dayExpense, 0);

      savingsHistory.push({
        date: dateStr,
        savings: daySavings,
      });
    }

    // Calculate 7-day and 30-day growth
    const last7DaysGrowth = savingsHistory
      .slice(-7)
      .reduce((sum, h) => sum + h.savings, 0);
    const last30DaysGrowth = savingsHistory
      .reduce((sum, h) => sum + h.savings, 0);

    // Calculate momentum indicator
    const first7DaysGrowth = savingsHistory
      .slice(0, 7)
      .reduce((sum, h) => sum + h.savings, 0);
    const momentumChange = first7DaysGrowth > 0 
      ? ((last7DaysGrowth - first7DaysGrowth) / first7DaysGrowth) * 100 
      : 0;

    let momentumIndicator: 'accelerating' | 'stable' | 'slowing' = 'stable';
    if (momentumChange > 20) {
      momentumIndicator = 'accelerating';
    } else if (momentumChange < -20) {
      momentumIndicator = 'slowing';
    }

    // Calculate savings rate (savings / income)
    const savingsRate = totalIncome > 0 
      ? ((totalIncome - totalExpense) / totalIncome) * 100 
      : 0;

    // Check for unallocated funds (potential weakness)
    const totalAllocated = savingsTargets.reduce(
      (sum, t) => sum + t.allocations.reduce((s, a) => s + a.amount, 0),
      0
    );
    const unallocatedFunds = Math.max(totalSavings - totalAllocated, 0);

    return NextResponse.json({
      totalIncome,
      totalExpense,
      balance,
      totalSavings,
      debtRatio,
      savingsTargets,
      transactions,
      expenseByCategory,
      // Growth metrics
      last7DaysGrowth,
      last30DaysGrowth,
      momentumIndicator,
      momentumChange,
      savingsHistory,
      savingsRate,
      unallocatedFunds,
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
