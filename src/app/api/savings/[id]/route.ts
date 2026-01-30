import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      targetAmount,
      targetDate,
      currentAmount,
      initialInvestment,
      monthlyContribution,
      yearlyInterestRate,
    } = body;

    // Verify savings target belongs to user
    const existingTarget = await db.savingsTarget.findFirst({
      where: {
        id: params.id,
        userId,
      },
    });

    if (!existingTarget) {
      return NextResponse.json(
        { error: 'Savings target not found' },
        { status: 404 }
      );
    }

    const savingsTarget = await db.savingsTarget.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(targetAmount && { targetAmount }),
        ...(targetDate && { targetDate: new Date(targetDate) }),
        ...(currentAmount !== undefined && { currentAmount }),
        ...(initialInvestment !== undefined && { initialInvestment }),
        ...(monthlyContribution !== undefined && { monthlyContribution }),
        ...(yearlyInterestRate !== undefined && { yearlyInterestRate }),
      },
    });

    return NextResponse.json({ savingsTarget });

  } catch (error) {
    console.error('Savings PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update savings target' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify savings target belongs to user
    const existingTarget = await db.savingsTarget.findFirst({
      where: {
        id: params.id,
        userId,
      },
      include: {
        allocations: true,
      },
    });

    if (!existingTarget) {
      return NextResponse.json(
        { error: 'Savings target not found' },
        { status: 404 }
      );
    }

    await db.savingsTarget.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Savings DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete savings target' },
      { status: 500 }
    );
  }
}
