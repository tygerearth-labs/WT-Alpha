import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

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

    // Verify category belongs to user (only if categoryId is being changed)
    if (categoryId !== undefined) {
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
    }

    // Validate type if being updated
    if (type !== undefined) {
      if (!['income', 'expense'].includes(type)) {
        return NextResponse.json(
          { error: 'Type must be income or expense' },
          { status: 400 }
        );
      }
    }

    // Validate amount if being updated
    if (amount !== undefined) {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {};
    if (type !== undefined) updateData.type = type;
    if (amount !== undefined) {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      updateData.amount = numAmount;
    }
    if (description !== undefined) updateData.description = description;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (date !== undefined) updateData.date = date ? new Date(date) : undefined;

    const transaction = await db.transaction.update({
      where: { id },
      data: updateData,
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
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

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
    // and delete everything atomically (including the transaction itself)
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
        // Delete the transaction inside the same transaction
        db.transaction.delete({
          where: { id },
        }),
      ]);
    } else {
      // No allocation — just delete the transaction
      await db.transaction.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Transaction DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
