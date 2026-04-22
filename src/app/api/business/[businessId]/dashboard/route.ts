import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    // Verify business belongs to user
    const business = await db.business.findFirst({
      where: { id: businessId, userId },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter for sales and cash entries
    const dateFilter: Record<string, Date> | undefined =
      startDate || endDate
        ? {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          }
        : undefined;

    // Run all queries in parallel for performance
    const [
      salesResult,
      kasBesarResult,
      kasKecilResult,
      kasKeluarResult,
      pendingInvoicesResult,
      hutangResult,
      piutangResult,
      debtsDueSoonResult,
      recentSales,
      recentCashEntries,
    ] = await Promise.all([
      // Total revenue from sales
      db.businessSale.aggregate({
        _sum: { amount: true },
        where: { businessId, ...(dateFilter ? { date: dateFilter } : {}) },
      }),

      // Total kas_besar
      db.businessCash.aggregate({
        _sum: { amount: true },
        where: {
          businessId,
          type: 'kas_besar',
          ...(dateFilter ? { date: dateFilter } : {}),
        },
      }),

      // Total kas_kecil
      db.businessCash.aggregate({
        _sum: { amount: true },
        where: {
          businessId,
          type: 'kas_kecil',
          ...(dateFilter ? { date: dateFilter } : {}),
        },
      }),

      // Total kas_keluar (expenses)
      db.businessCash.aggregate({
        _sum: { amount: true },
        where: {
          businessId,
          type: 'kas_keluar',
          ...(dateFilter ? { date: dateFilter } : {}),
        },
      }),

      // Pending invoices count
      db.businessInvoice.count({
        where: {
          businessId,
          status: { in: ['pending', 'overdue'] },
        },
      }),

      // Total hutang (payables remaining)
      db.businessDebt.aggregate({
        _sum: { remaining: true },
        where: {
          businessId,
          type: 'hutang',
          status: { in: ['active', 'partially_paid', 'overdue'] },
        },
      }),

      // Total piutang (receivables remaining)
      db.businessDebt.aggregate({
        _sum: { remaining: true },
        where: {
          businessId,
          type: 'piutang',
          status: { in: ['active', 'partially_paid', 'overdue'] },
        },
      }),

      // Debts due within 7 days
      db.businessDebt.findMany({
        where: {
          businessId,
          status: { in: ['active', 'partially_paid'] },
          dueDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),

      // Recent sales (last 5)
      db.businessSale.findMany({
        where: { businessId },
        orderBy: { date: 'desc' },
        take: 5,
        include: {
          customer: { select: { name: true } },
        },
      }),

      // Recent cash entries (last 5)
      db.businessCash.findMany({
        where: { businessId },
        orderBy: { date: 'desc' },
        take: 5,
      }),
    ]);

    const totalRevenue = salesResult._sum.amount || 0;
    const totalKasBesar = kasBesarResult._sum.amount || 0;
    const totalKasKecil = kasKecilResult._sum.amount || 0;
    const totalExpense = kasKeluarResult._sum.amount || 0;
    const pendingInvoices = pendingInvoicesResult;
    const totalHutang = hutangResult._sum.remaining || 0;
    const totalPiutang = piutangResult._sum.remaining || 0;
    const profit = totalRevenue - totalExpense;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return NextResponse.json({
      totalRevenue,
      totalExpense,
      profit,
      profitMargin,
      totalKasBesar,
      totalKasKecil,
      netCash: totalKasBesar + totalKasKecil - totalExpense,
      pendingInvoices,
      totalHutang,
      totalPiutang,
      debtsDueSoon: debtsDueSoonResult,
      recentSales,
      recentCashEntries,
    });
  } catch (error) {
    console.error('Dashboard GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
