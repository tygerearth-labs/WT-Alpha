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

    // Verify ownership
    const existing = await db.billReminder.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, amount, dueDate, category, recurrence, notes, isPaid } = body;

    // Build update data
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (amount !== undefined) {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
      }
      updateData.amount = numAmount;
    }
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (category !== undefined) updateData.category = category;
    if (recurrence !== undefined) {
      const validRecurrences = ['one-time', 'monthly', 'weekly'];
      if (!validRecurrences.includes(recurrence)) {
        return NextResponse.json({ error: 'Invalid recurrence' }, { status: 400 });
      }
      updateData.recurrence = recurrence;
    }
    if (notes !== undefined) updateData.notes = notes || null;

    // Handle marking as paid/unpaid
    if (isPaid !== undefined) {
      updateData.isPaid = isPaid;
      if (isPaid && !existing.isPaid) {
        updateData.paidAt = new Date();
      } else if (!isPaid) {
        updateData.paidAt = null;
      }
    }

    const bill = await db.billReminder.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ bill });
  } catch (error) {
    console.error('Bills PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update bill' },
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

    // Verify ownership
    const existing = await db.billReminder.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    await db.billReminder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bills DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    );
  }
}
