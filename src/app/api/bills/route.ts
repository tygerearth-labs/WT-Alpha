import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all'; // upcoming, overdue, paid, all
    const month = searchParams.get('month'); // YYYY-MM

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const threeDaysLater = new Date(todayStart.getTime() + 3 * 86400000);

    // Build where clause
    const whereClause: any = { userId };

    if (month) {
      const [year, mon] = month.split('-').map(Number);
      if (!isNaN(year) && !isNaN(mon) && mon >= 1 && mon <= 12) {
        whereClause.dueDate = {
          gte: new Date(year, mon - 1, 1),
          lt: new Date(year, mon, 1),
        };
      }
    }

    if (status === 'overdue') {
      whereClause.isPaid = false;
      if (!month) {
        whereClause.dueDate = { lt: todayStart };
      }
    } else if (status === 'upcoming') {
      whereClause.isPaid = false;
      if (!month) {
        whereClause.dueDate = { gte: todayStart };
      }
    } else if (status === 'paid') {
      whereClause.isPaid = true;
    }
    // 'all' — no extra filters

    const bills = await db.billReminder.findMany({
      where: whereClause,
      orderBy: { dueDate: 'asc' },
    });

    // Compute summary stats (always for current month)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [monthlyTotal, unpaidCount, overdueCount, paidCount] = await Promise.all([
      db.billReminder.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          dueDate: { gte: currentMonthStart, lt: currentMonthEnd },
        },
      }),
      db.billReminder.count({
        where: { userId, isPaid: false, dueDate: { gte: todayStart } },
      }),
      db.billReminder.count({
        where: { userId, isPaid: false, dueDate: { lt: todayStart } },
      }),
      db.billReminder.count({
        where: {
          userId,
          isPaid: true,
          paidAt: { gte: currentMonthStart, lt: currentMonthEnd },
        },
      }),
    ]);

    return NextResponse.json({
      bills,
      stats: {
        monthlyTotal: monthlyTotal._sum.amount || 0,
        unpaidCount,
        overdueCount,
        paidCount,
      },
    });
  } catch (error) {
    console.error('Bills GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
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
    const { name, amount, dueDate, category, recurrence, notes } = body;

    if (!name || !amount || !dueDate) {
      return NextResponse.json(
        { error: 'Name, amount, and due date are required' },
        { status: 400 }
      );
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const validRecurrences = ['one-time', 'monthly', 'weekly'];
    const rec = recurrence || 'one-time';
    if (!validRecurrences.includes(rec)) {
      return NextResponse.json(
        { error: 'Invalid recurrence. Must be one-time, monthly, or weekly' },
        { status: 400 }
      );
    }

    const bill = await db.billReminder.create({
      data: {
        userId,
        name,
        amount: numAmount,
        dueDate: new Date(dueDate),
        category: category || 'Lainnya',
        recurrence: rec,
        notes: notes || null,
      },
    });

    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    console.error('Bills POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    );
  }
}
