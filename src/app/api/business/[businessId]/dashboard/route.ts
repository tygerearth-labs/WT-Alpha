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
      salesCountResult,
      kasBesarResult,
      kasKecilResult,
      kasKeluarResult,
      pendingInvoicesResult,
      hutangResult,
      piutangResult,
      debtsDueSoonResult,
      recentSales,
      recentCashEntries,
      topProductsRaw,
      piutangAll,
      allCashForAllocation,
    ] = await Promise.all([
      // Total revenue from sales
      db.businessSale.aggregate({
        _sum: { amount: true },
        where: { businessId, ...(dateFilter ? { date: dateFilter } : {}) },
      }),

      // Sales count
      db.businessSale.count({
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

      // Piutang debts due within 7 days OR already overdue
      db.businessDebt.findMany({
        where: {
          businessId,
          type: 'piutang',
          OR: [
            {
              status: { in: ['active', 'partially_paid'] },
              dueDate: {
                lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            },
            { status: 'overdue' },
          ],
        },
        orderBy: { dueDate: 'asc' },
        include: {
          payments: {
            select: { id: true, amount: true, paymentDate: true },
            orderBy: { paymentDate: 'asc' },
          },
        },
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

      // Top products sold (non-installment only) — group by description
      db.businessSale.findMany({
        where: {
          businessId,
          installmentTempo: null,
        },
        select: {
          description: true,
          amount: true,
        },
      }),

      // All piutang debts for summary
      db.businessDebt.findMany({
        where: {
          businessId,
          type: 'piutang',
        },
        select: {
          status: true,
          amount: true,
          remaining: true,
        },
      }),

      // All cash entries for allocation breakdown
      db.businessCash.findMany({
        where: { businessId },
        select: {
          type: true,
          amount: true,
          source: true,
        },
      }),
    ]);

    const totalRevenue = salesResult._sum.amount || 0;
    const salesCount = salesCountResult || 0;
    const averageSaleValue = salesCount > 0 ? totalRevenue / salesCount : 0;
    const totalKasBesar = kasBesarResult._sum.amount || 0;
    const totalKasKecil = kasKecilResult._sum.amount || 0;
    const totalExpense = kasKeluarResult._sum.amount || 0;
    const pendingInvoices = pendingInvoicesResult;
    const totalHutang = hutangResult._sum.remaining || 0;
    const totalPiutang = piutangResult._sum.remaining || 0;
    const profit = totalRevenue - totalExpense;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // ── debtsDueSoon: piutang debts about to be due or overdue ──
    const debtsDueSoon = debtsDueSoonResult.map((d) => {
      const entry: Record<string, unknown> = {
        id: d.id,
        counterpart: d.counterpart,
        remaining: d.remaining,
        dueDate: d.dueDate,
        status: d.status,
      };
      if (d.installmentPeriod && d.installmentPeriod > 0) {
        const paidTempo = d.payments.length;
        entry.installmentInfo = {
          currentTempo: paidTempo,
          paidTempo,
          totalPeriod: d.installmentPeriod,
          nextInstallmentDate: d.nextInstallmentDate,
        };
      }
      return entry;
    });

    // ── topProductsSold: top 5 non-installment products by count ──
    const productMap = new Map<string, { count: number; revenue: number }>();
    for (const sale of topProductsRaw) {
      const key = sale.description;
      const existing = productMap.get(key);
      if (existing) {
        existing.count += 1;
        existing.revenue += sale.amount;
      } else {
        productMap.set(key, { count: 1, revenue: sale.amount });
      }
    }
    const topProductsSold = Array.from(productMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        totalQuantity: data.count,
        totalRevenue: data.revenue,
      }));

    // ── piutangSummary ──
    let piutangBerjalan = { count: 0, amount: 0 };
    let piutangMenunggak = { count: 0, amount: 0 };
    let piutangSelesai = { count: 0, amount: 0 };
    for (const d of piutangAll) {
      if (d.status === 'active' || d.status === 'partially_paid') {
        piutangBerjalan.count += 1;
        piutangBerjalan.amount += d.remaining;
      } else if (d.status === 'overdue') {
        piutangMenunggak.count += 1;
        piutangMenunggak.amount += d.remaining;
      } else if (d.status === 'paid') {
        piutangSelesai.count += 1;
        piutangSelesai.amount += d.amount;
      }
    }

    return NextResponse.json({
      totalRevenue,
      totalExpense,
      profit,
      profitMargin,
      totalKasBesar,
      totalKasKecil,
      totalKasKeluar: totalExpense,
      netCash: totalKasBesar + totalKasKecil - totalExpense,
      pendingInvoices,
      totalHutang,
      totalPiutang,
      debtsDueSoon,
      salesCount,
      averageSaleValue,
      recentSales,
      recentCashEntries,
      topProductsSold,
      piutangSummary: {
        cicilanBerjalan: piutangBerjalan,
        cicilanMenunggak: piutangMenunggak,
        cicilanSelesai: piutangSelesai,
        berjalan: piutangBerjalan,
        menunggak: piutangMenunggak,
        selesai: piutangSelesai,
      },
      allocationBreakdown: (() => {
        const allocKasBesarTotal = allCashForAllocation.filter((c) => c.type === 'kas_besar').reduce((s, c) => s + c.amount, 0);
        const allocKasKecilTotal = allCashForAllocation.filter((c) => c.type === 'kas_kecil').reduce((s, c) => s + c.amount, 0);
        const allocInvestorTotal = allCashForAllocation.filter((c) => c.type === 'investor').reduce((s, c) => s + c.amount, 0);
        const allocExpenseKasBesar = allCashForAllocation.filter((c) => c.type === 'kas_keluar' && c.source === 'kas_besar').reduce((s, c) => s + c.amount, 0);
        const allocExpenseKasKecil = allCashForAllocation.filter((c) => c.type === 'kas_keluar' && c.source === 'kas_kecil').reduce((s, c) => s + c.amount, 0);
        const allocExpenseInvestor = allCashForAllocation.filter((c) => c.type === 'kas_keluar' && c.source === 'investor').reduce((s, c) => s + c.amount, 0);
        const allocTotalExpenses = allCashForAllocation.filter((c) => c.type === 'kas_keluar').reduce((s, c) => s + c.amount, 0);
        const kasBesarSaldo = allocKasBesarTotal - allocExpenseKasBesar;
        const kasKecilSaldo = allocKasKecilTotal - allocExpenseKasKecil;
        const investorSaldo = allocInvestorTotal - allocExpenseInvestor;
        const unallocatedExpenses = allocTotalExpenses - allocExpenseKasBesar - allocExpenseKasKecil - allocExpenseInvestor;
        return {
          kasBesarTotal: allocKasBesarTotal,
          kasKecilTotal: allocKasKecilTotal,
          investorTotal: allocInvestorTotal,
          expenseFromKasBesar: allocExpenseKasBesar,
          expenseFromKasKecil: allocExpenseKasKecil,
          expenseFromInvestor: allocExpenseInvestor,
          kasBesarSaldo,
          kasKecilSaldo,
          netCash: kasBesarSaldo + kasKecilSaldo + investorSaldo - unallocatedExpenses,
          breakdown: [
            { source: 'kas_besar', total: allocKasBesarTotal, expenses: allocExpenseKasBesar, saldo: kasBesarSaldo },
            { source: 'kas_kecil', total: allocKasKecilTotal, expenses: allocExpenseKasKecil, saldo: kasKecilSaldo },
            { source: 'investor', total: allocInvestorTotal, expenses: allocExpenseInvestor, saldo: investorSaldo },
          ],
        };
      })(),
    });
  } catch (error) {
    console.error('Dashboard GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
