import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/budgets — Fetch budgets for authenticated user
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    const now = new Date();
    const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1;
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Month must be between 1 and 12' },
        { status: 400 },
      );
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: 'Year must be a valid number between 2000 and 2100' },
        { status: 400 },
      );
    }

    const budgets = await db.budget.findMany({
      where: {
        userId,
        month,
        year,
      },
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also fetch the total spent per category for this month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const transactions = await db.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        categoryId: true,
        amount: true,
      },
    });

    // Calculate spent per category
    const spentByCategory: Record<string, number> = {};
    for (const txn of transactions) {
      spentByCategory[txn.categoryId] = (spentByCategory[txn.categoryId] || 0) + txn.amount;
    }

    // Attach spent amount to each budget
    const budgetsWithSpent = budgets.map((budget) => ({
      ...budget,
      spent: spentByCategory[budget.categoryId] || 0,
    }));

    return NextResponse.json({
      budgets: budgetsWithSpent,
      month,
      year,
    });
  } catch (error) {
    console.error('Budgets GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 },
    );
  }
}

// POST /api/budgets — Create or update a budget entry (upsert)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const body = await request.json();
    const { categoryId, amount, month, year } = body;

    if (!categoryId || amount === undefined || !month || !year) {
      return NextResponse.json(
        { error: 'categoryId, amount, month, and year are required' },
        { status: 400 },
      );
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const numMonth = typeof month === 'string' ? parseInt(month) : month;
    const numYear = typeof year === 'string' ? parseInt(year) : year;

    if (isNaN(numAmount) || numAmount < 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 },
      );
    }

    if (isNaN(numMonth) || numMonth < 1 || numMonth > 12) {
      return NextResponse.json(
        { error: 'Month must be between 1 and 12' },
        { status: 400 },
      );
    }
    if (isNaN(numYear) || numYear < 2000 || numYear > 2100) { return NextResponse.json({ error: 'Year must be a valid number between 2000 and 2100' }, { status: 400 }); }

    // Verify category belongs to user
    const category = await db.category.findFirst({
      where: { id: categoryId, userId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    // Use upsert on the unique constraint (userId, categoryId, month, year)
    const budget = await db.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId,
          categoryId,
          month: numMonth,
          year: numYear,
        },
      },
      create: {
        userId,
        categoryId,
        amount: numAmount,
        month: numMonth,
        year: numYear,
      },
      update: {
        amount: numAmount,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error('Budget POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create/update budget' },
      { status: 500 },
    );
  }
}

// DELETE /api/budgets — Delete a budget entry
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const body = await request.json();
    const { categoryId, month, year } = body;

    if (!categoryId || !month || !year) {
      return NextResponse.json(
        { error: 'categoryId, month, and year are required' },
        { status: 400 },
      );
    }

    const numMonth = typeof month === 'string' ? parseInt(month) : month;
    const numYear = typeof year === 'string' ? parseInt(year) : year;

    const budget = await db.budget.findFirst({
      where: {
        userId,
        categoryId,
        month: numMonth,
        year: numYear,
      },
    });

    if (!budget) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 },
      );
    }

    await db.budget.delete({
      where: { id: budget.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Budget DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget' },
      { status: 500 },
    );
  }
}
