import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        },
      },
      orderBy: {
        targetDate: 'asc',
      },
    });

    return NextResponse.json({ savingsTargets });

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

    const savingsTarget = await db.savingsTarget.create({
      data: {
        name,
        targetAmount,
        currentAmount: initialInvestment || 0,
        targetDate: new Date(targetDate),
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
