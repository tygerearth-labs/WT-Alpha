import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

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
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify transaction belongs to user and get allocation info
    const existingTransaction = await db.transaction.findFirst({
      where: { id, userId },
      include: { allocation: true },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // If this transaction is allocated to a savings target, reverse the allocation
    if (existingTransaction.allocation) {
      await db.$transaction([
        // Reverse the savings target increment
        db.savingsTarget.update({
          where: { id: existingTransaction.allocation.targetId },
          data: { currentAmount: { decrement: existingTransaction.allocation.amount } },
        }),
        // Delete the allocation (also cascaded by DB, but explicit is safer)
        db.allocation.delete({
          where: { id: existingTransaction.allocation.id },
        }),
      ]);
    }

    // Now delete the transaction
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
