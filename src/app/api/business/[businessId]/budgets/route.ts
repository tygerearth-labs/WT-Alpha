import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyBusinessOwnership(businessId: string, userId: string) {
  const business = await db.business.findFirst({
    where: { id: businessId, userId },
  });
  return !!business;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const periodParam = searchParams.get('period');
    const yearParam = searchParams.get('year');

    const now = new Date();
    const period = periodParam ? parseInt(periodParam) : now.getMonth() + 1;
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();

    if (isNaN(period) || period < 1 || period > 12) {
      return NextResponse.json(
        { error: 'Period must be between 1 and 12' },
        { status: 400 }
      );
    }

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: 'Invalid year' },
        { status: 400 }
      );
    }

    // Date range for the given month/year
    const startDate = new Date(year, period - 1, 1);
    const endDate = new Date(year, period, 0, 23, 59, 59, 999);

    // Fetch budgets and expense entries in parallel
    const [budgets, cashOutEntries] = await Promise.all([
      db.businessBudget.findMany({
        where: { businessId, period, year },
        include: {
          allocations: {
            include: {
              investor: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { categoryName: 'asc' },
      }),
      db.businessCash.findMany({
        where: {
          businessId,
          type: 'kas_keluar',
          date: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          category: true,
          amount: true,
          description: true,
          date: true,
          source: true,
        },
      }),
    ]);

    // Group expenses by category for quick lookup
    const spentByCategory: Record<string, number> = {};
    for (const entry of cashOutEntries) {
      if (entry.category) {
        spentByCategory[entry.category] = (spentByCategory[entry.category] || 0) + entry.amount;
      }
    }

    // Build response with spent calculations
    const budgetsWithSpent = budgets.map((budget) => {
      const spent = spentByCategory[budget.categoryName] || 0;
      const remaining = budget.amount - spent;
      const spentPct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return {
        id: budget.id,
        businessId: budget.businessId,
        categoryName: budget.categoryName,
        categoryId: budget.categoryId,
        amount: budget.amount,
        period: budget.period,
        year: budget.year,
        notes: budget.notes,
        isActive: budget.isActive,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
        spent,
        remaining,
        spentPct: Math.round(spentPct * 100) / 100,
        allocations: budget.allocations.map((alloc) => ({
          id: alloc.id,
          fundSource: alloc.fundSource,
          investorId: alloc.investorId,
          investorName: alloc.investor?.name || null,
          amount: alloc.amount,
          description: alloc.description,
          createdAt: alloc.createdAt,
          updatedAt: alloc.updatedAt,
        })),
      };
    });

    // Summary calculations
    const totalBudget = budgetsWithSpent.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgetsWithSpent.reduce((sum, b) => sum + b.spent, 0);
    const totalAllocated = budgetsWithSpent.reduce(
      (sum, b) => sum + b.allocations.reduce((aSum, a) => aSum + a.amount, 0),
      0
    );
    const totalRemaining = budgetsWithSpent.reduce((sum, b) => sum + b.remaining, 0);
    const budgetCount = budgetsWithSpent.length;
    const overBudgetCount = budgetsWithSpent.filter((b) => b.spent > b.amount).length;

    return NextResponse.json({
      budgets: budgetsWithSpent,
      summary: {
        totalBudget,
        totalSpent,
        totalAllocated,
        totalRemaining,
        budgetCount,
        overBudgetCount,
      },
    });
  } catch (error) {
    console.error('Budgets GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { categoryName, categoryId, amount, period, year, notes, allocations } = body;

    // Validation
    if (!categoryName || typeof categoryName !== 'string' || categoryName.trim().length === 0) {
      return NextResponse.json(
        { error: 'categoryName is required' },
        { status: 400 }
      );
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const numPeriod = typeof period === 'string' ? parseInt(period) : period;
    if (isNaN(numPeriod) || numPeriod < 1 || numPeriod > 12) {
      return NextResponse.json(
        { error: 'Period must be between 1 and 12' },
        { status: 400 }
      );
    }

    const numYear = typeof year === 'string' ? parseInt(year) : year;
    if (isNaN(numYear) || numYear < 2000 || numYear > 2100) {
      return NextResponse.json(
        { error: 'Invalid year' },
        { status: 400 }
      );
    }

    // Validate allocations if provided
    if (allocations && Array.isArray(allocations)) {
      const validFundSources = ['kas_besar', 'kas_kecil', 'investor'];
      for (let i = 0; i < allocations.length; i++) {
        const alloc = allocations[i];
        if (!alloc.fundSource || !validFundSources.includes(alloc.fundSource)) {
          return NextResponse.json(
            { error: `Allocation ${i + 1}: fundSource must be kas_besar, kas_kecil, or investor` },
            { status: 400 }
          );
        }
        const allocAmount = typeof alloc.amount === 'string' ? parseFloat(alloc.amount) : alloc.amount;
        if (isNaN(allocAmount) || allocAmount <= 0) {
          return NextResponse.json(
            { error: `Allocation ${i + 1}: amount must be a positive number` },
            { status: 400 }
          );
        }
      }
    }

    // Check for duplicate
    const existingBudget = await db.businessBudget.findFirst({
      where: {
        businessId,
        categoryName: categoryName.trim(),
        period: numPeriod,
        year: numYear,
      },
    });

    if (existingBudget) {
      return NextResponse.json(
        { error: 'A budget for this category already exists for this period/year' },
        { status: 409 }
      );
    }

    // Validate investor IDs if provided in allocations
    if (allocations && Array.isArray(allocations)) {
      const investorIds = allocations
        .filter((a: { investorId?: string }) => a.investorId)
        .map((a: { investorId: string }) => a.investorId);

      if (investorIds.length > 0) {
        const investors = await db.businessInvestor.findMany({
          where: {
            id: { in: investorIds },
            businessId,
          },
          select: { id: true },
        });

        const validInvestorIds = new Set(investors.map((inv) => inv.id));
        for (const invId of investorIds) {
          if (!validInvestorIds.has(invId)) {
            return NextResponse.json(
              { error: `Investor with id ${invId} not found in this business` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Create budget + allocations in a transaction
    const budget = await db.$transaction(async (tx) => {
      const created = await tx.businessBudget.create({
        data: {
          businessId,
          categoryName: categoryName.trim(),
          categoryId: categoryId || null,
          amount: numAmount,
          period: numPeriod,
          year: numYear,
          notes: notes || null,
          isActive: true,
        },
        include: {
          allocations: {
            include: {
              investor: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (allocations && Array.isArray(allocations) && allocations.length > 0) {
        await tx.businessFundAllocation.createMany({
          data: allocations.map((alloc: { fundSource: string; investorId?: string; amount: number; description?: string }) => ({
            businessId,
            budgetId: created.id,
            fundSource: alloc.fundSource,
            investorId: alloc.investorId || null,
            amount: typeof alloc.amount === 'string' ? parseFloat(alloc.amount) : alloc.amount,
            description: alloc.description || null,
          })),
        });

        // Re-fetch with allocations
        return tx.businessBudget.findUnique({
          where: { id: created.id },
          include: {
            allocations: {
              include: {
                investor: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        });
      }

      return created;
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error('Budgets POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create budget' },
      { status: 500 }
    );
  }
}
