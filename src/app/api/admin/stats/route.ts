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

      const dateStr = day.toISOString().split('T')[0];
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
      const result = await db.$queryRawUnsafe<{ page_count: number; page_size: number }[]>(
        'SELECT page_count, page_size FROM pragma_page_count(), pragma_page_size()'
      );
      if (result && result[0]) {
        const bytes = result[0].page_count * result[0].page_size;
        if (bytes < 1024) databaseSize = `${bytes} B`;
        else if (bytes < 1024 * 1024) databaseSize = `${(bytes / 1024).toFixed(1)} KB`;
        else databaseSize = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      }
    } catch {
      databaseSize = 'Unknown';
    }

    const systemHealth = {
      databaseSize,
      uptime: Math.round(startTime),
      activeSessions: adminSessions
    };

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
      systemHealth
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
