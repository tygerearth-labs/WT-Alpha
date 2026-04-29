import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// ─── Helpers ──────────────────────────────────────────────────────

type PeriodType = 'monthly' | 'quarterly' | 'yearly';

interface DateRange {
  from: Date;
  to: Date;
}

function getPeriodDateRange(period: PeriodType, year: number, month?: number, quarter?: number): DateRange {
  const from = new Date();
  const to = new Date();

  switch (period) {
    case 'monthly': {
      const m = month || 1;
      from.setFullYear(year, m - 1, 1);
      from.setHours(0, 0, 0, 0);
      to.setFullYear(year, m, 0);
      to.setHours(23, 59, 59, 999);
      break;
    }
    case 'quarterly': {
      const q = quarter || 1;
      const startMonth = (q - 1) * 3;
      from.setFullYear(year, startMonth, 1);
      from.setHours(0, 0, 0, 0);
      to.setFullYear(year, startMonth + 3, 0);
      to.setHours(23, 59, 59, 999);
      break;
    }
    case 'yearly': {
      from.setFullYear(year, 0, 1);
      from.setHours(0, 0, 0, 0);
      to.setFullYear(year, 11, 31);
      to.setHours(23, 59, 59, 999);
      break;
    }
  }

  return { from, to };
}

function getPreviousPeriodDateRange(period: PeriodType, year: number, month?: number, quarter?: number): DateRange {
  switch (period) {
    case 'monthly': {
      const m = (month || 1) - 1;
      if (m === 0) return getPeriodDateRange('monthly', year - 1, 12);
      return getPeriodDateRange('monthly', year, m);
    }
    case 'quarterly': {
      const q = (quarter || 1) - 1;
      if (q === 0) return getPeriodDateRange('quarterly', year - 1, 4);
      return getPeriodDateRange('quarterly', year, q);
    }
    case 'yearly': {
      return getPeriodDateRange('yearly', year - 1);
    }
  }
}

function getPeriodLabel(period: PeriodType, year: number, month?: number, quarter?: number): string {
  const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  switch (period) {
    case 'monthly':
      return `${MONTH_NAMES[(month || 1) - 1]} ${year}`;
    case 'quarterly':
      return `Q${quarter || 1} ${year}`;
    case 'yearly':
      return `Tahun ${year}`;
  }
}

function calcPctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// ─── Main Handler ────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    // Verify ownership
    const business = await db.business.findFirst({
      where: { id: businessId, userId },
    });
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') || 'monthly') as PeriodType;
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') || '1');
    const quarter = parseInt(searchParams.get('quarter') || '1');

    if (!['monthly', 'quarterly', 'yearly'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period. Use monthly, quarterly, or yearly.' }, { status: 400 });
    }
    if (isNaN(year)) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    const dateRange = getPeriodDateRange(period, year, month, quarter);
    const prevDateRange = getPreviousPeriodDateRange(period, year, month, quarter);

    // ── Fetch current period cash entries ──
    const currentEntries = await db.businessCash.findMany({
      where: {
        businessId,
        date: { gte: dateRange.from, lte: dateRange.to },
      },
      select: {
        type: true,
        amount: true,
        category: true,
        source: true,
      },
    });

    // ── Fetch previous period cash entries (for comparison) ──
    const prevEntries = await db.businessCash.findMany({
      where: {
        businessId,
        date: { gte: prevDateRange.from, lte: prevDateRange.to },
      },
      select: {
        type: true,
        amount: true,
        category: true,
      },
    });

    // ── Aggregate Income ──
    // Income: kas_besar, kas_kecil, investor (with category modal) entries
    const incomeEntries = currentEntries.filter(
      (e) => e.type === 'kas_besar' || e.type === 'kas_kecil' || e.type === 'investor'
    );
    const totalRevenue = incomeEntries.reduce((sum, e) => sum + e.amount, 0);

    // Income by category
    const incomeByCategory = new Map<string, { total: number; count: number }>();
    for (const entry of incomeEntries) {
      const cat = entry.category || 'Lainnya';
      const existing = incomeByCategory.get(cat) || { total: 0, count: 0 };
      incomeByCategory.set(cat, { total: existing.total + entry.amount, count: existing.count + 1 });
    }
    const revenueCategories = Array.from(incomeByCategory.entries())
      .map(([category, { total, count }]) => ({
        category,
        total,
        count,
        percentage: totalRevenue > 0 ? (total / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ── Aggregate Expenses ──
    const expenseEntries = currentEntries.filter((e) => e.type === 'kas_keluar');
    const totalExpenses = expenseEntries.reduce((sum, e) => sum + e.amount, 0);

    // Expenses by category
    const expenseByCategory = new Map<string, { total: number; count: number }>();
    for (const entry of expenseEntries) {
      const cat = entry.category || 'Lainnya';
      const existing = expenseByCategory.get(cat) || { total: 0, count: 0 };
      expenseByCategory.set(cat, { total: existing.total + entry.amount, count: existing.count + 1 });
    }
    const expenseCategories = Array.from(expenseByCategory.entries())
      .map(([category, { total, count }]) => ({
        category,
        total,
        count,
        percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ── P&L Calculations ──
    const grossProfit = totalRevenue;
    const operatingExpenses = totalExpenses;
    const netProfit = grossProfit - operatingExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // ── Previous Period Comparison ──
    const prevIncomeEntries = prevEntries.filter(
      (e) => e.type === 'kas_besar' || e.type === 'kas_kecil' || e.type === 'investor'
    );
    const prevExpenseEntries = prevEntries.filter((e) => e.type === 'kas_keluar');
    const prevRevenue = prevIncomeEntries.reduce((sum, e) => sum + e.amount, 0);
    const prevExpenses = prevExpenseEntries.reduce((sum, e) => sum + e.amount, 0);
    const prevNetProfit = prevRevenue - prevExpenses;
    const prevProfitMargin = prevRevenue > 0 ? (prevNetProfit / prevRevenue) * 100 : 0;

    const comparison = {
      prevRevenue,
      prevExpenses,
      prevNetProfit,
      prevProfitMargin,
      revenueChange: calcPctChange(totalRevenue, prevRevenue),
      expensesChange: calcPctChange(totalExpenses, prevExpenses),
      netProfitChange: calcPctChange(netProfit, prevNetProfit),
      profitMarginChange: parseFloat((profitMargin - prevProfitMargin).toFixed(1)),
    };

    // ── Chart Data: sub-period breakdown ──
    let chartData: Array<{ period: string; revenue: number; expenses: number; netProfit: number }> = [];

    if (period === 'yearly') {
      // Monthly breakdown for yearly view
      for (let m = 0; m < 12; m++) {
        const mFrom = new Date(year, m, 1, 0, 0, 0, 0);
        const mTo = new Date(year, m + 1, 0, 23, 59, 59, 999);

        const mEntries = await db.businessCash.findMany({
          where: {
            businessId,
            date: { gte: mFrom, lte: mTo },
          },
          select: { type: true, amount: true },
        });

        const mRevenue = mEntries
          .filter((e) => e.type === 'kas_besar' || e.type === 'kas_kecil' || e.type === 'investor')
          .reduce((sum, e) => sum + e.amount, 0);
        const mExpenses = mEntries
          .filter((e) => e.type === 'kas_keluar')
          .reduce((sum, e) => sum + e.amount, 0);

        const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
        chartData.push({
          period: MONTH_NAMES[m],
          revenue: mRevenue,
          expenses: mExpenses,
          netProfit: mRevenue - mExpenses,
        });
      }
    } else if (period === 'quarterly') {
      // Monthly breakdown within the quarter
      const qStartMonth = (quarter - 1) * 3;
      const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

      for (let m = 0; m < 3; m++) {
        const monthIdx = qStartMonth + m;
        const mFrom = new Date(year, monthIdx, 1, 0, 0, 0, 0);
        const mTo = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

        const mEntries = await db.businessCash.findMany({
          where: {
            businessId,
            date: { gte: mFrom, lte: mTo },
          },
          select: { type: true, amount: true },
        });

        const mRevenue = mEntries
          .filter((e) => e.type === 'kas_besar' || e.type === 'kas_kecil' || e.type === 'investor')
          .reduce((sum, e) => sum + e.amount, 0);
        const mExpenses = mEntries
          .filter((e) => e.type === 'kas_keluar')
          .reduce((sum, e) => sum + e.amount, 0);

        chartData.push({
          period: MONTH_NAMES[monthIdx],
          revenue: mRevenue,
          expenses: mExpenses,
          netProfit: mRevenue - mExpenses,
        });
      }
    } else {
      // Weekly breakdown for monthly view
      const daysInMonth = new Date(year, month, 0).getDate();
      let weekNum = 1;

      for (let day = 1; day <= daysInMonth; day += 7) {
        const wFrom = new Date(year, month - 1, day, 0, 0, 0, 0);
        const wTo = new Date(year, month - 1, Math.min(day + 6, daysInMonth), 23, 59, 59, 999);

        const wEntries = await db.businessCash.findMany({
          where: {
            businessId,
            date: { gte: wFrom, lte: wTo },
          },
          select: { type: true, amount: true },
        });

        const wRevenue = wEntries
          .filter((e) => e.type === 'kas_besar' || e.type === 'kas_kecil' || e.type === 'investor')
          .reduce((sum, e) => sum + e.amount, 0);
        const wExpenses = wEntries
          .filter((e) => e.type === 'kas_keluar')
          .reduce((sum, e) => sum + e.amount, 0);

        chartData.push({
          period: `Mg ${weekNum}`,
          revenue: wRevenue,
          expenses: wExpenses,
          netProfit: wRevenue - wExpenses,
        });
        weekNum++;
      }
    }

    return NextResponse.json({
      period: {
        type: period,
        year,
        ...(period === 'monthly' ? { month } : {}),
        ...(period === 'quarterly' ? { quarter } : {}),
        label: getPeriodLabel(period, year, month, quarter),
      },
      summary: {
        totalRevenue,
        totalExpenses,
        grossProfit,
        operatingExpenses,
        netProfit,
        profitMargin,
      },
      revenueCategories,
      expenseCategories,
      comparison,
      chartData,
    });
  } catch (error) {
    console.error('P&L GET error:', error);
    return NextResponse.json(
      { error: 'Failed to generate P&L report' },
      { status: 500 }
    );
  }
}
