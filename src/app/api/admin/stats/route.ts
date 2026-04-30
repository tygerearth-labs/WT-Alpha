import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/admin/stats — Dashboard statistics
export async function GET() {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const totalUsers = await db.user.count({ where: { role: 'user' } });
    const activeUsers = await db.user.count({ where: { role: 'user', status: 'active' } });
    const suspendedUsers = await db.user.count({ where: { role: 'user', status: 'suspended' } });
    const proUsers = await db.user.count({ where: { plan: 'pro', role: 'user' } });
    const basicUsers = await db.user.count({ where: { plan: 'basic', role: 'user' } });

    const activeInvites = await db.inviteToken.count({
      where: { isUsed: false, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
    });
    const usedInvites = await db.inviteToken.count({ where: { isUsed: true } });

    const recentUsers = await db.user.findMany({
      where: { role: 'user' },
      select: { id: true, email: true, username: true, plan: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const usersExpiringSoon = await db.user.count({
      where: {
        subscriptionEnd: { gt: new Date(), lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        role: 'user'
      }
    });

    // --- New fields ---

    // dailyRegistrations: last 7 days of registration counts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentRegistrations = await db.user.findMany({
      where: {
        role: 'user',
        createdAt: { gte: sevenDaysAgo }
      },
      select: { createdAt: true }
    });

    const dailyRegistrations: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date();
      day.setDate(day.getDate() - (6 - i));
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const dateStr = day.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
      const count = recentRegistrations.filter(
        (r) => r.createdAt >= day && r.createdAt < nextDay
      ).length;

      dailyRegistrations.push({ date: dateStr, count });
    }

    // planDistribution: plan counts with percentages
    const allUsersForPlan = await db.user.findMany({
      select: { plan: true }
    });
    const planCounts: Record<string, number> = {};
    for (const u of allUsersForPlan) {
      planCounts[u.plan] = (planCounts[u.plan] || 0) + 1;
    }
    const totalForPlan = allUsersForPlan.length;
    const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
      plan,
      count,
      percentage: totalForPlan > 0 ? Math.round((count / totalForPlan) * 10000) / 100 : 0
    }));

    // topUsers: top 3 most active users by transaction count
    const topUsers = await db.user.findMany({
      where: { role: 'user' },
      select: {
        id: true,
        username: true,
        email: true,
        plan: true,
        _count: { select: { transactions: true } }
      },
      orderBy: { transactions: { _count: 'desc' } },
      take: 3
    });

    // systemHealth: database size, uptime, active sessions
    const startTime = process.uptime();
    const adminSessions = await db.user.count({
      where: { role: 'admin', status: 'active' }
    });

    let databaseSize = 'Unknown';
    try {
      // SQLite-compatible: count records across main tables to estimate DB size
      const userCount = await db.user.count();
      const txCount = await db.transaction.count();
      const catCount = await db.category.count();
      const busCount = await db.business.count();
      const salesCount = await db.businessSale.count();
      const totalRecords = userCount + txCount + catCount + busCount + salesCount;
      // Rough estimate: ~2KB per record
      const estimatedBytes = totalRecords * 2048;
      if (estimatedBytes < 1024 * 1024) databaseSize = `${(estimatedBytes / 1024).toFixed(1)} KB`;
      else databaseSize = `${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch {
      databaseSize = 'Unknown';
    }

    const systemHealth = {
      databaseSize,
      uptime: Math.round(startTime),
      activeSessions: adminSessions
    };

    // --- Business Stats ---
    const totalBusinesses = await db.business.count();
    const activeBusinesses = await db.business.count({ where: { isActive: true } });

    // Sum of all BusinessSale amounts
    const salesAgg = await db.businessSale.aggregate({
      _sum: { amount: true }
    });
    const totalBusinessSales = salesAgg._sum.amount ?? 0;

    // --- Investment Stats ---
    const totalPortfolios = await db.investmentPortfolio.count();
    const openPositions = await db.investmentPortfolio.count({ where: { status: 'open' } });

    // Total investment value = sum of (currentPrice * quantity) for open positions
    const openPositionsData = await db.investmentPortfolio.findMany({
      where: { status: 'open' },
      select: { currentPrice: true, quantity: true }
    });
    const totalInvestmentValue = openPositionsData.reduce(
      (sum, p) => sum + (p.currentPrice * p.quantity),
      0
    );

    return NextResponse.json({
      totalUsers,
      activeUsers,
      suspendedUsers,
      proUsers,
      basicUsers,
      activeInvites,
      usedInvites,
      recentUsers,
      usersExpiringSoon,
      dailyRegistrations,
      planDistribution,
      topUsers,
      systemHealth,
      // Business stats
      totalBusinesses,
      activeBusinesses,
      totalBusinessSales,
      // Investment stats
      totalPortfolios,
      openPositions,
      totalInvestmentValue,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
