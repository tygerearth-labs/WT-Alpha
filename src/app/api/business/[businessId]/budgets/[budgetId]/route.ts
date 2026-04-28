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
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string; budgetId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId, budgetId } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const budget = await db.businessBudget.findFirst({
      where: { id: budgetId, businessId },
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

    if (!budget) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      );
    }

    // Calculate spent amount for this budget's category in the budget's period/year
    const startDate = new Date(budget.year, budget.period - 1, 1);
    const endDate = new Date(budget.year, budget.period, 0, 23, 59, 59, 999);

    const [expenseEntries, spentAggregate] = await Promise.all([
      // Recent kas_keluar entries matching this category
      db.businessCash.findMany({
        where: {
          businessId,
          type: 'kas_keluar',
          category: budget.categoryName,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'desc' },
        take: 20,
      }),
      // Total spent for this category
      db.businessCash.aggregate({
        _sum: { amount: true },
        where: {
          businessId,
          type: 'kas_keluar',
          category: budget.categoryName,
          date: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const spent = spentAggregate._sum.amount || 0;
    const remaining = budget.amount - spent;
    const spentPct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    return NextResponse.json({
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
      recentExpenses: expenseEntries.map((entry) => ({
        id: entry.id,
        description: entry.description,
        amount: entry.amount,
        date: entry.date,
        source: entry.source,
        category: entry.category,
      })),
    });
  } catch (error) {
    console.error('Budget GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; budgetId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId, budgetId } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const existingBudget = await db.businessBudget.findFirst({
      where: { id: budgetId, businessId },
    });

    if (!existingBudget) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { amount, notes, isActive, allocations } = body;

    // Validate amount if provided
    if (amount !== undefined) {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a positive number' },
          { status: 400 }
        );
      }
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

      // Validate investor IDs
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

    // Update budget + manage allocations in a transaction
    const budget = await db.$transaction(async (tx) => {
      // Update budget fields
      const updated = await tx.businessBudget.update({
        where: { id: budgetId },
        data: {
          ...(amount !== undefined && { amount: typeof amount === 'string' ? parseFloat(amount) : amount }),
          ...(notes !== undefined && { notes }),
          ...(isActive !== undefined && { isActive }),
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

      // If allocations array is provided, replace all allocations
      if (allocations && Array.isArray(allocations)) {
        // Delete existing allocations
        await tx.businessFundAllocation.deleteMany({
          where: { budgetId },
        });

        // Create new allocations if array is not empty
        if (allocations.length > 0) {
          await tx.businessFundAllocation.createMany({
            data: allocations.map((alloc: { fundSource: string; investorId?: string; amount: number; description?: string }) => ({
              businessId,
              budgetId,
              fundSource: alloc.fundSource,
              investorId: alloc.investorId || null,
              amount: typeof alloc.amount === 'string' ? parseFloat(alloc.amount) : alloc.amount,
              description: alloc.description || null,
            })),
          });
        }

        // Re-fetch with updated allocations
        return tx.businessBudget.findUnique({
          where: { id: budgetId },
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

      return updated;
    });

    return NextResponse.json({ budget });
  } catch (error) {
    console.error('Budget PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string; budgetId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId, budgetId } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const existingBudget = await db.businessBudget.findFirst({
      where: { id: budgetId, businessId },
    });

    if (!existingBudget) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      );
    }

    // Hard delete budget and its allocations (cascading)
    await db.businessBudget.delete({
      where: { id: budgetId },
    });

    return NextResponse.json({ success: true, message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Budget DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget' },
      { status: 500 }
    );
  }
}
