import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { calculateTargetMetrics, getCurrentMonthAllocation } from '@/lib/targetLogic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const savingsTargets = await db.savingsTarget.findMany({
      where: { userId },
      include: {
        allocations: {
          include: {
            transaction: {
              include: {
                category: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        targetDate: 'asc',
      },
    });

    // Calculate comprehensive metrics for each target
    const savingsTargetsWithMetrics = savingsTargets.map((target) => {
      const currentMonthlyAllocation = getCurrentMonthAllocation(target.allocations);
      const metrics = calculateTargetMetrics(target, target.allocations);

      // Calculate monthly achievement percentage
      const monthlyAchievement = target.monthlyContribution > 0
        ? (currentMonthlyAllocation / target.monthlyContribution) * 100
        : 0;

      return {
        ...target,
        currentMonthlyAllocation,
        monthlyAchievement,
        metrics,
      };
    });

    return NextResponse.json({ savingsTargets: savingsTargetsWithMetrics });

  } catch (error) {
    console.error('Savings GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch savings targets' },
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
    const {
      name,
      targetAmount,
      targetDate,
      initialInvestment,
      monthlyContribution,
      allocationPercentage,
    } = body;

    if (!name || !targetAmount || !targetDate) {
      return NextResponse.json(
        { error: 'Name, target amount, and target date are required' },
        { status: 400 }
      );
    }

    // Validate targetAmount is positive
    const numTargetAmount = typeof targetAmount === 'string' ? parseFloat(targetAmount) : targetAmount;
    if (isNaN(numTargetAmount) || numTargetAmount <= 0) {
      return NextResponse.json(
        { error: 'Target amount must be a positive number' },
        { status: 400 }
      );
    }

    // Validate monthlyContribution is >= 0
    if (monthlyContribution !== undefined && monthlyContribution !== null) {
      const numMonthlyContribution = typeof monthlyContribution === 'string' ? parseFloat(monthlyContribution) : monthlyContribution;
      if (isNaN(numMonthlyContribution) || numMonthlyContribution < 0) {
        return NextResponse.json(
          { error: 'Monthly contribution must be zero or a positive number' },
          { status: 400 }
        );
      }
    }

    // Validate allocationPercentage is 0-100
    if (allocationPercentage !== undefined && allocationPercentage !== null) {
      const numAllocationPercentage = typeof allocationPercentage === 'string' ? parseFloat(allocationPercentage) : allocationPercentage;
      if (isNaN(numAllocationPercentage) || numAllocationPercentage < 0 || numAllocationPercentage > 100) {
        return NextResponse.json(
          { error: 'Allocation percentage must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // Validate targetDate is in the future
    const targetDateObj = new Date(targetDate);
    if (isNaN(targetDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid target date' },
        { status: 400 }
      );
    }
    if (targetDateObj <= new Date()) {
      return NextResponse.json(
        { error: 'Target date must be in the future' },
        { status: 400 }
      );
    }

    // Validate initialInvestment is >= 0
    if (initialInvestment !== undefined && initialInvestment !== null) {
      const numInitialInvestment = typeof initialInvestment === 'string' ? parseFloat(initialInvestment) : initialInvestment;
      if (isNaN(numInitialInvestment) || numInitialInvestment < 0) {
        return NextResponse.json(
          { error: 'Initial investment must be zero or a positive number' },
          { status: 400 }
        );
      }
    }

    // Enforce plan limit on savings targets
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { maxSavings: true },
    });

    if (user) {
      const count = await db.savingsTarget.count({ where: { userId } });
      if (count >= user.maxSavings) {
        return NextResponse.json(
          { error: `Savings target limit (${user.maxSavings}) reached. Upgrade to Pro for more targets.`, code: 'LIMIT_REACHED' },
          { status: 403 },
        );
      }
    }

    const savingsTarget = await db.savingsTarget.create({
      data: {
        name,
        targetAmount: numTargetAmount,
        currentAmount: initialInvestment || 0,
        targetDate: targetDateObj,
        initialInvestment: initialInvestment || 0,
        monthlyContribution: monthlyContribution || 0,
        allocationPercentage: allocationPercentage || 0,
        userId,
      },
    });

    return NextResponse.json({ savingsTarget }, { status: 201 });

  } catch (error) {
    console.error('Savings POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create savings target' },
      { status: 500 }
    );
  }
}
