import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// PUT - Update existing savings target
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        targetAmount,
        targetDate: new Date(targetDate),
        initialInvestment: initialInvestment || 0,
        monthlyContribution: monthlyContribution || 0,
        allocationPercentage: allocationPercentage || 0,
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
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Delete all allocations for this target first
    await db.allocation.deleteMany({
      where: { targetId: id },
    });

    // Delete the target
    await db.savingsTarget.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Savings DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete savings target' },
      { status: 500 }
    );
  }
}
