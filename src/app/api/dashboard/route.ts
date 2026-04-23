import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function getMonthBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function formatMonth(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const filterYear = yearParam ? parseInt(yearParam) : currentYear;
    const filterMonth = monthParam ? parseInt(monthParam) : currentMonth;

    // Validate month and year params
    if (isNaN(filterMonth) || filterMonth < 1 || filterMonth > 12) {
      return NextResponse.json(
        { error: 'Month must be between 1 and 12' },
        { status: 400 }
      );
    }
    if (isNaN(filterYear) || filterYear < 2000 || filterYear > 2100) {
      return NextResponse.json(
        { error: 'Invalid year' },
        { status: 400 }
      );
    }

    const { start: filterStart, end: filterEnd } = getMonthBounds(filterYear, filterMonth);

    // Previous month bounds
    const prevMonth = filterMonth === 1 ? 12 : filterMonth - 1;
    const prevYear = filterMonth === 1 ? filterYear - 1 : filterYear;
    const { start: prevStart, end: prevEnd } = getMonthBounds(prevYear, prevMonth);

    // 6 months ago bounds (for trends)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // ───────────────────────────────────────────
    // BATCH QUERIES — all independent, run in parallel
    // ───────────────────────────────────────────

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      transactions,
      allTransactionsLast6Months,
      savingsTargets,
      transactionsByCategory,
      previousMonthTransactionsByCategory,
      categories,
      recentTransactions,
    ] = await Promise.all([
      // Current filter month transactions (original query)
      db.transaction.findMany({
        where: {
          userId,
          date: { gte: filterStart, lt: filterEnd },
        },
        include: { category: true },
        orderBy: { date: 'desc' },
      }),

      // All transactions for last 6 months (for trends)
      db.transaction.findMany({
        where: {
          userId,
          date: { gte: sixMonthsAgo },
        },
        select: {
          type: true,
          amount: true,
          date: true,
        },
      }),

      // Savings targets with allocations
      db.savingsTarget.findMany({
        where: { userId },
        include: { allocations: true },
        orderBy: { targetDate: 'asc' },
      }),

      // Current month expense grouping by category
      db.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'expense',
          date: { gte: filterStart, lt: filterEnd },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // Previous month expense grouping by category (for trend)
      db.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'expense',
          date: { gte: prevStart, lt: prevEnd },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // All expense categories
      db.category.findMany({
        where: {
          userId,
          type: 'expense',
        },
      }),

      // Last 30 days transactions for savings history (parallel with other queries)
      db.transaction.findMany({
        where: { userId, date: { gte: thirtyDaysAgo } },
        orderBy: { date: 'asc' },
      }),
    ]);

    // ───────────────────────────────────────────
    // EXISTING CALCULATIONS (preserved)
    // ───────────────────────────────────────────

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;
    const savingsFromTargets = savingsTargets.reduce((sum, t) => sum + t.currentAmount, 0);
    const netBalance = totalIncome - totalExpense;
    const totalSavings = Math.max(savingsFromTargets, netBalance, 0);

    const expenseByCategory = transactionsByCategory.map((t) => {
      const category = categories.find((c) => c.id === t.categoryId);
      return {
        category: category?.name || 'Lainnya',
        amount: t._sum.amount || 0,
        color: category?.color || '#6b7280',
        icon: category?.icon || '📦',
      };
    }).sort((a, b) => b.amount - a.amount);

    const totalDebt = 0;
    const debtRatio = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;

    // Savings history (last 30 days)
    const savingsHistory: Array<{ date: string; savings: number }> = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      let dayIncome = 0;
      let dayExpense = 0;
      for (const transaction of recentTransactions) {
        const txDate = new Date(transaction.date);
        if (txDate >= dayStart && txDate <= dayEnd) {
          if (transaction.type === 'income') dayIncome += transaction.amount;
          else if (transaction.type === 'expense') dayExpense += transaction.amount;
        }
      }

      savingsHistory.push({
        date: dateStr,
        savings: Math.max(dayIncome - dayExpense, 0),
      });
    }

    const last7DaysGrowth = savingsHistory.slice(-7).reduce((sum, h) => sum + h.savings, 0);
    const last30DaysGrowth = savingsHistory.reduce((sum, h) => sum + h.savings, 0);

    const first7DaysGrowth = savingsHistory.slice(0, 7).reduce((sum, h) => sum + h.savings, 0);
    const momentumChange = first7DaysGrowth > 0
      ? ((last7DaysGrowth - first7DaysGrowth) / first7DaysGrowth) * 100
      : 0;

    let momentumIndicator: 'accelerating' | 'stable' | 'slowing' = 'stable';
    if (momentumChange > 20) momentumIndicator = 'accelerating';
    else if (momentumChange < -20) momentumIndicator = 'slowing';

    const savingsRate = totalIncome > 0
      ? ((totalIncome - totalExpense) / totalIncome) * 100
      : 0;

    const totalAllocated = savingsTargets.reduce(
      (sum, t) => sum + t.allocations.reduce((s, a) => s + a.amount, 0),
      0
    );
    const unallocatedFunds = Math.max(totalSavings - totalAllocated, 0);

    // ───────────────────────────────────────────
    // 1. MONTHLY TRENDS (last 6 months)
    // ───────────────────────────────────────────

    const monthlyTrends: Array<{
      month: string;
      monthNum: number;
      year: number;
      income: number;
      expense: number;
      savings: number;
      savingsRate: number;
      transactionCount: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const trendDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const tYear = trendDate.getFullYear();
      const tMonth = trendDate.getMonth() + 1;
      const tStart = new Date(tYear, tMonth - 1, 1);
      const tEnd = new Date(tYear, tMonth, 1);

      const monthTxns = allTransactionsLast6Months.filter((t) => {
        const d = new Date(t.date);
        return d >= tStart && d < tEnd;
      });

      const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const savings = income - expense;
      const sr = income > 0 ? (savings / income) * 100 : 0;

      monthlyTrends.push({
        month: formatMonth(tYear, tMonth),
        monthNum: tMonth,
        year: tYear,
        income,
        expense,
        savings,
        savingsRate: sr,
        transactionCount: monthTxns.length,
      });
    }

    // ───────────────────────────────────────────
    // 2. FINANCIAL HEALTH SCORE
    // ───────────────────────────────────────────

    // Savings Rate Score (0-25): 0% → 0, 10% → 10, 20%+ → 25
    const currentSavingsRate = totalIncome > 0
      ? Math.max((totalIncome - totalExpense) / totalIncome, 0) * 100
      : 0;
    const savingsRateScore = Math.min(Math.round((currentSavingsRate / 20) * 25), 25);

    // Consistency Score (0-25): based on positive savings months out of last 6
    const positiveSavingsMonths = monthlyTrends.filter((m) => m.savings > 0).length;
    const consistencyScore = Math.round((positiveSavingsMonths / 6) * 25);

    // Target Progress Score (0-25): average progress across all savings targets
    const targetProgresses = savingsTargets.map((t) =>
      t.targetAmount > 0 ? Math.min((t.currentAmount / t.targetAmount) * 100, 100) : 0
    );
    const avgTargetProgress = targetProgresses.length > 0
      ? targetProgresses.reduce((s, p) => s + p, 0) / targetProgresses.length
      : 0;
    const targetProgressScore = Math.round((avgTargetProgress / 100) * 25);

    // Growth Score (0-25): based on recent vs older savings trend
    let growthScore = 0;
    if (monthlyTrends.length >= 2) {
      const recent = monthlyTrends.slice(-3);
      const older = monthlyTrends.slice(0, 3);
      const recentAvg = recent.reduce((s, m) => s + m.savings, 0) / recent.length;
      const olderAvg = older.reduce((s, m) => s + m.savings, 0) / older.length;
      if (olderAvg > 0) {
        const growthPct = ((recentAvg - olderAvg) / olderAvg) * 100;
        growthScore = Math.min(Math.round(Math.max(growthPct, 0) / 10 * 25), 25);
      } else if (recentAvg > 0) {
        growthScore = 15; // grew from zero
      }
    }

    const financialHealthScore = savingsRateScore + consistencyScore + targetProgressScore + growthScore;

    let healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    let healthLabel: string;
    if (financialHealthScore >= 85) {
      healthGrade = 'A';
      healthLabel = 'Excellent';
    } else if (financialHealthScore >= 70) {
      healthGrade = 'B';
      healthLabel = 'Good';
    } else if (financialHealthScore >= 50) {
      healthGrade = 'C';
      healthLabel = 'Fair';
    } else if (financialHealthScore >= 30) {
      healthGrade = 'D';
      healthLabel = 'Poor';
    } else {
      healthGrade = 'F';
      healthLabel = 'Critical';
    }

    // ───────────────────────────────────────────
    // 3. MONTH-OVER-MONTH COMPARISON
    // ───────────────────────────────────────────

    const currentMonthTxns = allTransactionsLast6Months.filter((t) => {
      const d = new Date(t.date);
      return d >= filterStart && d < filterEnd;
    });

    const previousMonthTxns = allTransactionsLast6Months.filter((t) => {
      const d = new Date(t.date);
      return d >= prevStart && d < prevEnd;
    });

    const currentMonthIncome = currentMonthTxns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const currentMonthExpense = currentMonthTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const currentMonthSavings = currentMonthIncome - currentMonthExpense;

    const previousMonthIncome = previousMonthTxns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const previousMonthExpense = previousMonthTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const previousMonthSavings = previousMonthIncome - previousMonthExpense;

    const incomeChange = previousMonthIncome > 0
      ? ((currentMonthIncome - previousMonthIncome) / previousMonthIncome) * 100
      : (currentMonthIncome > 0 ? 100 : 0);
    const expenseChange = previousMonthExpense > 0
      ? ((currentMonthExpense - previousMonthExpense) / previousMonthExpense) * 100
      : (currentMonthExpense > 0 ? 100 : 0);
    const savingsChange = previousMonthSavings !== 0
      ? ((currentMonthSavings - previousMonthSavings) / Math.abs(previousMonthSavings)) * 100
      : (currentMonthSavings > 0 ? 100 : 0);
    const transactionCountChange = previousMonthTxns.length > 0
      ? ((currentMonthTxns.length - previousMonthTxns.length) / previousMonthTxns.length) * 100
      : (currentMonthTxns.length > 0 ? 100 : 0);

    const monthlyComparison = {
      incomeChange: Math.round(incomeChange * 10) / 10,
      expenseChange: Math.round(expenseChange * 10) / 10,
      savingsChange: Math.round(savingsChange * 10) / 10,
      transactionCountChange: Math.round(transactionCountChange * 10) / 10,
      currentMonthIncome,
      currentMonthExpense,
      previousMonthIncome,
      previousMonthExpense,
    };

    // ───────────────────────────────────────────
    // 4. TOP SPENDING CATEGORIES (top 5)
    // ───────────────────────────────────────────

    // Build a lookup for previous month category amounts
    const prevCategoryMap = new Map<string, { amount: number; count: number }>();
    for (const pc of previousMonthTransactionsByCategory) {
      prevCategoryMap.set(pc.categoryId, {
        amount: pc._sum.amount || 0,
        count: pc._count.id,
      });
    }

    const topCategories = transactionsByCategory
      .map((t) => {
        const category = categories.find((c) => c.id === t.categoryId);
        const amount = t._sum.amount || 0;
        const txnCount = t._count.id;
        const prev = prevCategoryMap.get(t.categoryId);
        const prevAmount = prev?.amount || 0;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        let trendPercentage = 0;
        if (prevAmount > 0) {
          const change = ((amount - prevAmount) / prevAmount) * 100;
          trendPercentage = Math.round(Math.abs(change) * 10) / 10;
          if (change > 5) trend = 'up';
          else if (change < -5) trend = 'down';
          else trend = 'stable';
        } else if (amount > 0) {
          trend = 'up';
          trendPercentage = 100;
        }

        return {
          name: category?.name || 'Lainnya',
          amount,
          percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 1000) / 10 : 0,
          color: category?.color || '#6b7280',
          icon: category?.icon || '📦',
          trend,
          trendPercentage,
          transactionCount: txnCount,
          averagePerTransaction: txnCount > 0 ? Math.round((amount / txnCount) * 100) / 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // ───────────────────────────────────────────
    // 5. AVERAGE ANALYTICS
    // ───────────────────────────────────────────

    const daysInFilterMonth = new Date(filterYear, filterMonth, 0).getDate();
    const daysElapsed = Math.min(now.getDate(), daysInFilterMonth);
    const safeDaysElapsed = Math.max(daysElapsed, 1);

    const dailyExpense = Math.round((currentMonthExpense / safeDaysElapsed) * 100) / 100;
    const weeklyExpense = Math.round((dailyExpense * 7) * 100) / 100;
    const monthlyExpense = currentMonthExpense;
    const dailyIncome = Math.round((currentMonthIncome / safeDaysElapsed) * 100) / 100;
    const transactionSize = transactions.length > 0
      ? Math.round((transactions.reduce((s, t) => s + t.amount, 0) / transactions.length) * 100) / 100
      : 0;

    const averages = {
      dailyExpense,
      weeklyExpense,
      monthlyExpense,
      dailyIncome,
      transactionSize,
    };

    // ───────────────────────────────────────────
    // 6. CASH FLOW FORECAST
    // ───────────────────────────────────────────

    const daysRemaining = daysInFilterMonth - now.getDate();
    const dailyNetRate = safeDaysElapsed > 0
      ? (currentMonthIncome - currentMonthExpense) / safeDaysElapsed
      : 0;

    const projectedMonthEnd = totalSavings + (dailyNetRate * daysRemaining);
    const remainingMonths = 12 - currentMonth;
    const projectedYearEnd = projectedMonthEnd + (dailyNetRate * 30 * remainingMonths);

    const runwayMonths = dailyNetRate < 0
      ? Math.max(Math.round(totalSavings / Math.abs(dailyNetRate * 30)), 0)
      : 999; // indefinite if positive cash flow

    const dailyBurnRate = Math.round(Math.abs(
      currentMonthExpense > currentMonthIncome
        ? dailyNetRate // negative, already represents burn
        : 0
    ) * 100) / 100;

    const forecast = {
      projectedMonthEnd: Math.round(projectedMonthEnd * 100) / 100,
      projectedYearEnd: Math.round(projectedYearEnd * 100) / 100,
      runwayMonths: dailyNetRate < 0 ? runwayMonths : -1, // -1 = indefinite
      dailyBurnRate: Math.round(Math.abs(dailyNetRate) * 100) / 100,
    };

    // ───────────────────────────────────────────
    // 7. SAVINGS TARGET ANALYTICS
    // ───────────────────────────────────────────

    let onTrack = 0;
    let behind = 0;
    const targetDetails = savingsTargets.map((t) => {
      const progress = t.targetAmount > 0 ? (t.currentAmount / t.targetAmount) * 100 : 0;
      const monthsUntilTarget = Math.max(
        (t.targetDate.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000),
        0.1
      );
      const remainingAmount = Math.max(t.targetAmount - t.currentAmount, 0);
      const requiredMonthly = remainingAmount / monthsUntilTarget;
      const isOnTrack = t.monthlyContribution >= requiredMonthly || progress >= 100;

      if (isOnTrack) onTrack++;
      else behind++;

      return {
        name: t.name,
        progress: Math.min(progress, 100),
        targetDate: t.targetDate,
        isOnTrack,
        remainingAmount,
        requiredMonthly,
      };
    });

    const totalMonthlyContribution = savingsTargets.reduce(
      (s, t) => s + t.monthlyContribution, 0
    );
    const averageProgress = targetDetails.length > 0
      ? Math.round(targetDetails.reduce((s, t) => s + t.progress, 0) / targetDetails.length * 10) / 10
      : 0;

    // Nearest completion: find the target closest to 100% or with earliest date
    const completedOrNearest = targetDetails
      .filter((t) => t.progress < 100 && t.targetDate > now)
      .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());

    const nearestTarget = completedOrNearest.length > 0 ? completedOrNearest[0] : null;

    const targetAnalytics = {
      onTrack,
      behind,
      totalMonthlyContribution,
      averageProgress,
      nearestCompletion: nearestTarget?.name || null,
      nearestCompletionDate: nearestTarget
        ? nearestTarget.targetDate.toISOString().split('T')[0]
        : null,
    };

    // ───────────────────────────────────────────
    // FETCH PLATFORM CONFIG (section visibility + export settings)
    // ───────────────────────────────────────────

    let sectionVisibility: Record<string, Record<string, boolean>> | null = null;
    let exportEnabled: Record<string, Record<string, boolean>> | null = null;

    try {
      const platformConfig = await db.platformConfig.findUnique({ where: { id: 'platform' } });
      if (platformConfig) {
        sectionVisibility = platformConfig.sectionVisibility
          ? JSON.parse(platformConfig.sectionVisibility)
          : null;
        exportEnabled = platformConfig.exportEnabled
          ? JSON.parse(platformConfig.exportEnabled)
          : null;
      }
    } catch {
      // Non-critical — dashboard still works without config
    }

    // ───────────────────────────────────────────
    // FULL RESPONSE
    // ───────────────────────────────────────────

    return NextResponse.json({
      // ── Existing fields (preserved) ──
      totalIncome,
      totalExpense,
      balance,
      totalSavings,
      debtRatio,
      savingsTargets,
      transactions,
      expenseByCategory,
      last7DaysGrowth,
      last30DaysGrowth,
      momentumIndicator,
      momentumChange,
      savingsHistory,
      savingsRate,
      unallocatedFunds,

      // ── New analytics fields ──
      monthlyTrends,
      financialHealthScore,
      healthBreakdown: {
        savingsRateScore,
        consistencyScore,
        targetProgressScore,
        growthScore,
      },
      healthGrade,
      healthLabel,
      monthlyComparison,
      topCategories,
      averages,
      forecast,
      targetAnalytics,

      // ── Platform config fields ──
      sectionVisibility,
      exportEnabled,
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
