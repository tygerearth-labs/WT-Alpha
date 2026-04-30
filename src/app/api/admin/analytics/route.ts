import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const TZ = 'Asia/Jakarta';

/** Format a Date to YYYY-MM-DD in Jakarta timezone */
function toDateStr(d: Date): string {
  return d.toLocaleDateString('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** Format a Date to YYYY-MM in Jakarta timezone */
function toMonthStr(d: Date): string {
  return d.toLocaleDateString('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit' }).slice(0, 7);
}

/** Get the start of today in Jakarta timezone as a JS Date */
function startOfTodayInTZ(): Date {
  const now = new Date();
  const jakartaStr = now.toLocaleString('en-US', { timeZone: TZ });
  const jakartaDate = new Date(jakartaStr);
  return jakartaDate;
}

export async function GET() {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const now = startOfTodayInTZ();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalIncome, totalExpense, allTransactions, categoryMetrics, recentPlatformActivity] = await Promise.all([
      db.transaction.aggregate({
        where: { type: 'income' },
        _sum: { amount: true },
        _count: true,
      }),
      db.transaction.aggregate({
        where: { type: 'expense' },
        _sum: { amount: true },
        _count: true,
      }),
      db.transaction.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        select: { date: true, type: true, amount: true },
        orderBy: { date: 'asc' },
      }),
      db.$queryRaw<Array<{ name: string; icon: string; total: number; count: number }>>`
        SELECT c.name, c.icon, SUM(t.amount) as total, COUNT(*) as count
        FROM "Transaction" t
        JOIN "Category" c ON t."categoryId" = c.id
        WHERE t.type = 'expense'
        GROUP BY c.id, c.name, c.icon
        ORDER BY total DESC
        LIMIT 8
      `,
      db.adminActivityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, action: true, target: true, details: true, createdAt: true },
      }),
    ]);

    // Group daily stats from transaction data (timezone-aware)
    const dailyMap = new Map<string, { date: string; type: string; total: number; count: number }>();
    for (const tx of allTransactions) {
      const dateStr = toDateStr(tx.date);
      const key = `${dateStr}-${tx.type}`;
      const existing = dailyMap.get(key);
      if (existing) {
        existing.total += tx.amount;
        existing.count += 1;
      } else {
        dailyMap.set(key, { date: dateStr, type: tx.type, total: tx.amount, count: 1 });
      }
    }
    const dailyStats = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Group monthly aggregates from transaction data (SQLite compatible)
    const allRecentTx = await db.transaction.findMany({
      where: { date: { gte: sixMonthsAgo } },
      select: { date: true, type: true, amount: true },
    });

    const monthlyMap = new Map<string, { month: string; income: number; expense: number }>();
    for (const tx of allRecentTx) {
      const month = toMonthStr(tx.date);
      const existing = monthlyMap.get(month);
      if (existing) {
        if (tx.type === 'income') existing.income += tx.amount;
        else existing.expense += tx.amount;
      } else {
        monthlyMap.set(month, { month, income: tx.type === 'income' ? tx.amount : 0, expense: tx.type === 'expense' ? tx.amount : 0 });
      }
    }
    const monthlyAggregates = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      ...m,
      savings: m.income - m.expense,
    }));

    const totalUsers = await db.user.count({ where: { role: 'user' } });
    const activeUsersThisMonth = await db.user.count({
      where: {
        role: 'user',
        transactions: {
          some: {
            date: { gte: firstOfMonth },
          },
        },
      },
    });

    const engagementRate = totalUsers > 0 ? Math.round((activeUsersThisMonth / totalUsers) * 100) : 0;

    const savingsTargets = await db.savingsTarget.count();
    const activeSavingsTargets = await db.savingsTarget.count({ where: { isAllocated: true } });
    const categoriesCount = await db.category.count();
    const inviteTokens = await db.inviteToken.count({ where: { isUsed: false, expiresAt: { gt: new Date() } } });

    return NextResponse.json({
      financials: {
        totalIncome: Number(totalIncome._sum.amount ?? 0),
        totalExpense: Number(totalExpense._sum.amount ?? 0),
        netFlow: Number((totalIncome._sum.amount ?? 0) - (totalExpense._sum.amount ?? 0)),
        incomeTxnCount: totalIncome._count,
        expenseTxnCount: totalExpense._count,
      },
      dailyStats,
      topCategories: categoryMetrics.map(c => ({
        name: c.name,
        icon: c.icon,
        total: Number(c.total),
        count: Number(c.count),
      })),
      monthlyAggregates,
      engagement: {
        totalUsers,
        activeUsersThisMonth,
        engagementRate,
      },
      platformHealth: {
        savingsTargets,
        activeSavingsTargets,
        categories: categoriesCount,
        activeInvites: inviteTokens,
      },
      recentActivity: recentPlatformActivity,
    });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
