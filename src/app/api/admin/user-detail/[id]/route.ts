import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await requireAdmin();
    if (adminId instanceof NextResponse) return adminId;
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        image: true,
        plan: true,
        status: true,
        role: true,
        locale: true,
        currency: true,
        subscriptionEnd: true,
        maxCategories: true,
        maxSavings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [transactionCount, categoryCount, savingsCount, recentActivity] = await Promise.all([
      db.transaction.count({ where: { userId: id } }),
      db.category.count({ where: { userId: id } }),
      db.savingsTarget.count({ where: { userId: id } }),
      db.adminActivityLog.findMany({
        where: { target: { contains: user.email } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, action: true, details: true, createdAt: true },
      }),
    ]);

    const recentTransactions = await db.transaction.findMany({
      where: { userId: id },
      orderBy: { date: 'desc' },
      take: 5,
      select: { id: true, type: true, amount: true, description: true, date: true },
    });

    const totalIncome = await db.transaction.aggregate({
      where: { userId: id, type: 'income' },
      _sum: { amount: true },
    });

    const totalExpense = await db.transaction.aggregate({
      where: { userId: id, type: 'expense' },
      _sum: { amount: true },
    });

    const balance = (totalIncome._sum.amount ?? 0) - (totalExpense._sum.amount ?? 0);

    // Compute subscription info
    const now = new Date();
    const subscriptionEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
    const isExpired = subscriptionEnd ? subscriptionEnd < now : false;
    const daysRemaining = subscriptionEnd
      ? Math.max(0, Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return NextResponse.json({
      user,
      stats: {
        transactionCount,
        categoryCount,
        savingsCount,
        totalTransactions: transactionCount,
        totalCategories: categoryCount,
        totalSavingsTargets: savingsCount,
        categoryUsagePercent: user.maxCategories > 0 ? Math.round((categoryCount / user.maxCategories) * 100) : 0,
        savingsUsagePercent: user.maxSavings > 0 ? Math.round((savingsCount / user.maxSavings) * 100) : 0,
        totalIncome: totalIncome._sum.amount ?? 0,
        totalExpense: totalExpense._sum.amount ?? 0,
        balance,
        subscription: {
          status: isExpired ? 'expired' : user.status === 'suspended' ? 'suspended' : 'active',
          daysLeft: daysRemaining,
          end: user.subscriptionEnd,
        },
      },
      recentTransactions,
      recentActivity,
    });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('User detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
  }
}
