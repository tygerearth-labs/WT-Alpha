import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const userId = session.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { type, amount, description, categoryId, date } = body;

    // Verify transaction belongs to user
    const existingTransaction = await db.transaction.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Verify category belongs to user
    const category = await db.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const transaction = await db.transaction.update({
      where: { id },
      data: {
        type,
        amount,
        description,
        categoryId,
        date: date ? new Date(date) : undefined,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ transaction });

  } catch (error) {
    console.error('Transaction PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const userId = session.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify transaction belongs to user and include allocation
    const existingTransaction = await db.transaction.findFirst({
      where: {
        id,
        userId,
      },
      include: { allocation: true },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Reverse allocation if exists
    if (existingTransaction.allocation) {
      await db.savingsTarget.update({
        where: { id: existingTransaction.allocation.targetId },
        data: { currentAmount: { decrement: existingTransaction.allocation.amount } },
      });
      await db.allocation.delete({ where: { id: existingTransaction.allocation.id } });
    }

    await db.transaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Transaction DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
