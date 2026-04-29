import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// ─── Helpers ──────────────────────────────────────────────────────

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

interface MonthlyCashData {
  year: number;
  month: number;
  income: number;
  expenses: number;
  netCashFlow: number;
  incomeByCategory: Map<string, number>;
  expenseByCategory: Map<string, number>;
}

/**
 * Calculate linear regression slope for a set of values
 * Returns slope (change per month) and intercept
 */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Calculate coefficient of variation (CV) for confidence scoring
 * Lower CV = more consistent data = higher confidence
 */
function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 1;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 1;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance) / Math.abs(mean);
}

/**
 * Simple seasonal weighting: months further from the current month
 * get slightly less weight (more recent months matter more)
 */
function getSeasonalWeight(monthIndex: number, numMonths: number): number {
  return 0.5 + 0.5 * (monthIndex / (numMonths - 1));
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
    const forecastMonths = Math.min(Math.max(parseInt(searchParams.get('months') || '6'), 3), 24);

    // ── Fetch historical data: last 6 months minimum, up to 12 ──
    const lookbackMonths = Math.min(12, Math.max(6, forecastMonths));
    const now = new Date();
    const lookbackDate = new Date(now.getFullYear(), now.getMonth() - lookbackMonths, 1, 0, 0, 0, 0);

    const allEntries = await db.businessCash.findMany({
      where: {
        businessId,
        date: { gte: lookbackDate },
      },
      select: {
        type: true,
        amount: true,
        category: true,
        date: true,
      },
      orderBy: { date: 'asc' },
    });

    // Also compute current total balance (all time)
    const allTimeEntries = await db.businessCash.findMany({
      where: { businessId },
      select: { type: true, amount: true },
    });
    const allTimeIncome = allTimeEntries
      .filter((e) => e.type === 'kas_besar' || e.type === 'kas_kecil' || e.type === 'investor')
      .reduce((s, e) => s + e.amount, 0);
    const allTimeExpenses = allTimeEntries
      .filter((e) => e.type === 'kas_keluar')
      .reduce((s, e) => s + e.amount, 0);
    const currentBalance = allTimeIncome - allTimeExpenses;

    // ── Group data by month ──
    const monthlyData: Map<string, MonthlyCashData> = new Map();

    for (const entry of allEntries) {
      const d = entry.date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(key) || {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        income: 0,
        expenses: 0,
        netCashFlow: 0,
        incomeByCategory: new Map<string, number>(),
        expenseByCategory: new Map<string, number>(),
      };

      const isIncome = entry.type === 'kas_besar' || entry.type === 'kas_kecil' || entry.type === 'investor';
      const isExpense = entry.type === 'kas_keluar';

      if (isIncome) {
        existing.income += entry.amount;
        const cat = entry.category || 'Lainnya';
        existing.incomeByCategory.set(cat, (existing.incomeByCategory.get(cat) || 0) + entry.amount);
      }
      if (isExpense) {
        existing.expenses += entry.amount;
        const cat = entry.category || 'Lainnya';
        existing.expenseByCategory.set(cat, (existing.expenseByCategory.get(cat) || 0) + entry.amount);
      }

      existing.netCashFlow = existing.income - existing.expenses;
      monthlyData.set(key, existing);
    }

    // Sort by month
    const sortedMonthly = Array.from(monthlyData.values())
      .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));

    // Check if current month has data; if not, add it as zero
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData.has(currentMonthKey)) {
      sortedMonthly.push({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        income: 0,
        expenses: 0,
        netCashFlow: 0,
        incomeByCategory: new Map(),
        expenseByCategory: new Map(),
      });
    }

    const historicalMonths = sortedMonthly.length;

    // ── If insufficient data (less than 2 months), return minimal forecast ──
    if (historicalMonths < 2) {
      const minimalForecastMonths: Array<{
        month: string;
        monthIndex: number;
        year: number;
        income: number;
        expenses: number;
        netCashFlow: number;
        projectedBalance: number;
        isForecast: boolean;
      }> = [];

      for (let i = 1; i <= forecastMonths; i++) {
        const mDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        minimalForecastMonths.push({
          month: MONTH_NAMES_SHORT[mDate.getMonth()],
          monthIndex: mDate.getMonth() + 1,
          year: mDate.getFullYear(),
          income: 0,
          expenses: 0,
          netCashFlow: 0,
          projectedBalance: currentBalance,
          isForecast: true,
        });
      }

      return NextResponse.json({
        currentBalance,
        projectedBalance3: currentBalance,
        projectedBalance6: currentBalance,
        confidence: 'low',
        confidenceScore: 10,
        historicalMonths,
        avgMonthlyIncome: 0,
        avgMonthlyExpenses: 0,
        incomeTrend: 0,
        expenseTrend: 0,
        months: minimalForecastMonths,
        categories: [],
        chartData: [],
      });
    }

    // ── Compute weighted averages using seasonal weighting ──
    let weightedIncomeSum = 0;
    let weightedExpenseSum = 0;
    let weightTotal = 0;

    const incomeValues: number[] = [];
    const expenseValues: number[] = [];

    for (let i = 0; i < sortedMonthly.length; i++) {
      const m = sortedMonthly[i];
      const w = getSeasonalWeight(i, sortedMonthly.length);
      weightedIncomeSum += m.income * w;
      weightedExpenseSum += m.expenses * w;
      weightTotal += w;
      incomeValues.push(m.income);
      expenseValues.push(m.expenses);
    }

    const avgMonthlyIncome = weightTotal > 0 ? weightedIncomeSum / weightTotal : 0;
    const avgMonthlyExpenses = weightTotal > 0 ? weightedExpenseSum / weightTotal : 0;

    // ── Compute linear trends ──
    const incomeRegression = linearRegression(incomeValues);
    const expenseRegression = linearRegression(expenseValues);

    const incomeTrend = avgMonthlyIncome > 0 ? (incomeRegression.slope / avgMonthlyIncome) * 100 : 0;
    const expenseTrend = avgMonthlyExpenses > 0 ? (expenseRegression.slope / avgMonthlyExpenses) * 100 : 0;

    // ── Confidence scoring ──
    const incomeCV = coefficientOfVariation(incomeValues);
    const expenseCV = coefficientOfVariation(expenseValues);
    const dataScore = Math.min(historicalMonths / 12, 1) * 40;
    const consistencyScore = (1 - Math.min((incomeCV + expenseCV) / 2, 1)) * 60;

    const confidenceScore = Math.round(dataScore + consistencyScore);
    const confidence: 'low' | 'medium' | 'high' =
      confidenceScore >= 70 ? 'high' : confidenceScore >= 40 ? 'medium' : 'low';

    // ── Chart data ──
    const chartData: Array<{
      month: string;
      actualIncome?: number;
      actualExpenses?: number;
      actualBalance?: number;
      forecastIncome?: number;
      forecastExpenses?: number;
      forecastBalance?: number;
      forecastUpper?: number;
      forecastLower?: number;
      isForecast: boolean;
    }> = [];

    // Historical balance reconstruction
    const totalHistoricalNet = sortedMonthly.reduce((s, m) => s + m.netCashFlow, 0);
    let histStartBalance = currentBalance - totalHistoricalNet;
    let runningBalance = histStartBalance;

    for (const m of sortedMonthly) {
      runningBalance += m.netCashFlow;
      chartData.push({
        month: `${MONTH_NAMES_SHORT[m.month - 1]} ${m.year}`,
        actualIncome: m.income,
        actualExpenses: m.expenses,
        actualBalance: Math.round(runningBalance),
        isForecast: false,
      });
    }

    // ── Standard deviation for confidence bands ──
    const netCashFlowValues = sortedMonthly.map((m) => m.netCashFlow);
    const meanNet = netCashFlowValues.reduce((s, v) => s + v, 0) / netCashFlowValues.length;
    const stdDev = Math.sqrt(
      netCashFlowValues.reduce((s, v) => s + Math.pow(v - meanNet, 2), 0) / (netCashFlowValues.length - 1 || 1)
    );

    // ── Generate forecast months ──
    const forecastMonthsData: Array<{
      month: string;
      monthIndex: number;
      year: number;
      income: number;
      expenses: number;
      netCashFlow: number;
      projectedBalance: number;
      isForecast: boolean;
      confidenceRange?: [number, number];
    }> = [];

    for (let i = 1; i <= forecastMonths; i++) {
      const mDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthIdx = mDate.getMonth() + 1;
      const year = mDate.getFullYear();

      // Apply linear trend with damping
      const trendedIncome = Math.max(0, avgMonthlyIncome + incomeRegression.slope * i * 0.5);
      const trendedExpenses = Math.max(0, avgMonthlyExpenses + expenseRegression.slope * i * 0.3);

      // Seasonal modulation: use same month from previous year as hint
      let seasonalFactor = 1;
      const sameMonthLastYear = sortedMonthly.find(
        (m) => m.month === monthIdx && m.year === year - 1
      );
      if (sameMonthLastYear && avgMonthlyIncome > 0) {
        seasonalFactor = 0.8 + 0.2 * (sameMonthLastYear.income / avgMonthlyIncome);
      }

      const projectedIncome = Math.max(0, trendedIncome * seasonalFactor);
      const projectedExpenses = Math.max(0, trendedExpenses);
      const projectedNet = projectedIncome - projectedExpenses;
      runningBalance += projectedNet;

      // Confidence range widens over time
      const uncertaintyMultiplier = 1 + (i * 0.3);
      const upperBalance = Math.round(runningBalance + stdDev * uncertaintyMultiplier);
      const lowerBalance = Math.round(runningBalance - stdDev * uncertaintyMultiplier);

      forecastMonthsData.push({
        month: MONTH_NAMES_SHORT[monthIdx - 1],
        monthIndex: monthIdx,
        year,
        income: Math.round(projectedIncome),
        expenses: Math.round(projectedExpenses),
        netCashFlow: Math.round(projectedNet),
        projectedBalance: Math.round(runningBalance),
        isForecast: true,
        confidenceRange: confidence !== 'low' ? [lowerBalance, upperBalance] : undefined,
      });

      chartData.push({
        month: `${MONTH_NAMES_SHORT[monthIdx - 1]} ${year}`,
        forecastIncome: Math.round(projectedIncome),
        forecastExpenses: Math.round(projectedExpenses),
        forecastBalance: Math.round(runningBalance),
        forecastUpper: confidence !== 'low' ? upperBalance : undefined,
        forecastLower: confidence !== 'low' ? lowerBalance : undefined,
        isForecast: true,
      });
    }

    // ── Projected balances at 3 and 6 months ──
    const projectedBalance3 = forecastMonthsData.length >= 3
      ? forecastMonthsData[2].projectedBalance
      : forecastMonthsData[forecastMonthsData.length - 1]?.projectedBalance ?? currentBalance;

    const projectedBalance6 = forecastMonthsData.length >= 6
      ? forecastMonthsData[5].projectedBalance
      : forecastMonthsData[forecastMonthsData.length - 1]?.projectedBalance ?? currentBalance;

    // ── Aggregate categories from historical data (weighted) ──
    const incomeByCategory = new Map<string, { total: number; count: number }>();
    const expenseByCategory = new Map<string, { total: number; count: number }>();

    for (let i = 0; i < sortedMonthly.length; i++) {
      const m = sortedMonthly[i];
      const w = getSeasonalWeight(i, sortedMonthly.length);

      for (const [cat, amount] of m.incomeByCategory) {
        const existing = incomeByCategory.get(cat) || { total: 0, count: 0 };
        incomeByCategory.set(cat, { total: existing.total + amount * w, count: existing.count + 1 });
      }

      for (const [cat, amount] of m.expenseByCategory) {
        const existing = expenseByCategory.get(cat) || { total: 0, count: 0 };
        expenseByCategory.set(cat, { total: existing.total + amount * w, count: existing.count + 1 });
      }
    }

    const totalIncomeCat = Array.from(incomeByCategory.values()).reduce((s, v) => s + v.total, 0);
    const totalExpenseCat = Array.from(expenseByCategory.values()).reduce((s, v) => s + v.total, 0);

    const categories = [
      ...Array.from(incomeByCategory.entries())
        .map(([category, { total, count }]) => ({
          category,
          total: Math.round(total),
          count,
          percentage: totalIncomeCat > 0 ? (total / totalIncomeCat) * 100 : 0,
          type: 'income' as const,
        }))
        .sort((a, b) => b.total - a.total),
      ...Array.from(expenseByCategory.entries())
        .map(([category, { total, count }]) => ({
          category,
          total: Math.round(total),
          count,
          percentage: totalExpenseCat > 0 ? (total / totalExpenseCat) * 100 : 0,
          type: 'expense' as const,
        }))
        .sort((a, b) => b.total - a.total),
    ];

    // ── Combine historical + forecast into the months array ──
    const allMonths = [
      ...sortedMonthly.map((m) => ({
        month: MONTH_NAMES_SHORT[m.month - 1],
        monthIndex: m.month,
        year: m.year,
        income: Math.round(m.income),
        expenses: Math.round(m.expenses),
        netCashFlow: Math.round(m.netCashFlow),
        projectedBalance: 0, // will be filled below
        isForecast: false,
      })),
      ...forecastMonthsData,
    ];

    // Fill historical projectedBalance with running balance
    let runBal = currentBalance - totalHistoricalNet;
    for (let i = 0; i < allMonths.length; i++) {
      runBal += allMonths[i].netCashFlow;
      allMonths[i].projectedBalance = Math.round(runBal);
    }

    return NextResponse.json({
      currentBalance,
      projectedBalance3,
      projectedBalance6,
      confidence,
      confidenceScore,
      historicalMonths,
      avgMonthlyIncome: Math.round(avgMonthlyIncome),
      avgMonthlyExpenses: Math.round(avgMonthlyExpenses),
      incomeTrend: Math.round(incomeTrend * 10) / 10,
      expenseTrend: Math.round(expenseTrend * 10) / 10,
      months: allMonths,
      categories,
      chartData,
    });
  } catch (error) {
    console.error('Forecast GET error:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}
