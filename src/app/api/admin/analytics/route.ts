import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    await requireAdmin();

    const [totalIncome, totalExpense, transactionStats, categoryMetrics, recentPlatformActivity] = await Promise.all([
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
      db.$queryRaw<Array<{ date: string; type: string; total: bigint; count: bigint }>>`
        SELECT DATE(date) as date, type, SUM(amount) as total, COUNT(*) as count
        FROM "Transaction"
        WHERE date >= date('now', '-30 days')
        GROUP BY DATE(date), type
        ORDER BY date ASC
      `,
      db.$queryRaw<Array<{ name: string; icon: string; total: bigint; count: bigint }>>`
        SELECT c.name, c.icon, SUM(t.amount) as total, COUNT(*) as count
        FROM "Transaction" t
        JOIN "Category" c ON t."categoryId" = c.id
        WHERE t.type = 'expense'
        GROUP BY c.id
        ORDER BY total DESC
        LIMIT 8
      `,
      db.adminActivityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, action: true, target: true, details: true, createdAt: true },
      }),
    ]);

    const monthlyData = await db.$queryRaw<Array<{ month: string; income: bigint; expense: bigint }>>`
      SELECT strftime('%Y-%m', date) as month,
             SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
             SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM "Transaction"
      WHERE date >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    `;

    const totalUsers = await db.user.count({ where: { role: 'user' } });
    const activeUsersThisMonth = await db.user.count({
      where: {
        role: 'user',
        transactions: {
          some: {
            date: { gte: new Date(new Date().setDate(1)).toISOString() },
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
      dailyStats: transactionStats.map(s => ({
        date: s.date,
        type: s.type,
        total: Number(s.total),
        count: Number(s.count),
      })),
      topCategories: categoryMetrics.map(c => ({
        name: c.name,
        icon: c.icon,
        total: Number(c.total),
        count: Number(c.count),
      })),
      monthlyAggregates: monthlyData.map(m => ({
        month: m.month,
        income: Number(m.income),
        expense: Number(m.expense),
        savings: Number(m.income) - Number(m.expense),
      })),
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
