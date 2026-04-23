import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PUT - Update existing savings target
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { id } = await params;
    const body = await request.json();

    const {
      name,
      targetAmount,
      targetDate,
      initialInvestment,
      monthlyContribution,
      allocationPercentage,
      isAllocated,
    } = body;

    if (!name || !targetAmount || !targetDate) {
      return NextResponse.json(
        { error: 'Name, target amount, and target date are required' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    const numTargetAmount = typeof targetAmount === 'string' ? parseFloat(targetAmount) : targetAmount;
    if (isNaN(numTargetAmount) || numTargetAmount <= 0) {
      return NextResponse.json(
        { error: 'Target amount must be a positive number' },
        { status: 400 }
      );
    }

    const validDate = new Date(targetDate);
    if (isNaN(validDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid target date' },
        { status: 400 }
      );
    }

    const numInitial = initialInvestment != null ? parseFloat(String(initialInvestment)) : 0;
    const numMonthly = monthlyContribution != null ? parseFloat(String(monthlyContribution)) : 0;
    const numAllocPct = allocationPercentage != null ? parseFloat(String(allocationPercentage)) : 0;

    if (isNaN(numInitial) || numInitial < 0) {
      return NextResponse.json(
        { error: 'Initial investment must be a non-negative number' },
        { status: 400 }
      );
    }
    if (isNaN(numMonthly) || numMonthly < 0) {
      return NextResponse.json(
        { error: 'Monthly contribution must be a non-negative number' },
        { status: 400 }
      );
    }
    if (isNaN(numAllocPct) || numAllocPct < 0 || numAllocPct > 100) {
      return NextResponse.json(
        { error: 'Allocation percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Verify target belongs to user
    const existingTarget = await db.savingsTarget.findFirst({
      where: { id, userId },
    });

    if (!existingTarget) {
      return NextResponse.json(
        { error: 'Savings target not found' },
        { status: 404 }
      );
    }

    const savingsTarget = await db.savingsTarget.update({
      where: { id },
      data: {
        name,
        targetAmount: numTargetAmount,
        targetDate: validDate,
        initialInvestment: numInitial,
        monthlyContribution: numMonthly,
        allocationPercentage: numAllocPct,
        isAllocated: isAllocated !== undefined ? isAllocated : existingTarget.isAllocated,
      },
    });

    return NextResponse.json({ savingsTarget }, { status: 200 });
  } catch (error) {
    console.error('Savings PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update savings target' },
      { status: 500 }
    );
  }
}

// DELETE - Delete savings target
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { id } = await params;

    // Verify target belongs to user before deleting
    const existingTarget = await db.savingsTarget.findFirst({
      where: { id, userId },
    });

    if (!existingTarget) {
      return NextResponse.json(
        { error: 'Savings target not found' },
        { status: 404 }
      );
    }

    // Delete allocations and target atomically
    await db.$transaction([
      db.allocation.deleteMany({
        where: { targetId: id },
      }),
      db.savingsTarget.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Savings DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete savings target' },
      { status: 500 }
    );
  }
}
