import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyDebtOwnership(id: string, userId: string) {
  const debt = await db.businessDebt.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  });
  return debt?.business.userId === userId ? debt : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { id } = await params;

    const debt = await verifyDebtOwnership(id, userId);
    if (!debt) {
      return NextResponse.json(
        { error: 'Debt not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { type, counterpart, amount, remaining, dueDate, description, status } = body;

    const updateData: Record<string, unknown> = {};
    if (type !== undefined) updateData.type = type;
    if (counterpart !== undefined) updateData.counterpart = counterpart;
    if (amount !== undefined) updateData.amount = parseFloat(amount) || 0;
    if (remaining !== undefined) {
      updateData.remaining = parseFloat(remaining) || 0;
      // Auto-update status based on remaining
      const numRemaining = parseFloat(remaining) || 0;
      if (numRemaining <= 0) {
        updateData.status = 'paid';
      } else if (numRemaining < (parseFloat(amount) || 0)) {
        updateData.status = 'partially_paid';
      }
    }
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const updated = await db.businessDebt.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ debt: updated });
  } catch (error) {
    console.error('Debt PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update debt' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { id } = await params;

    const debt = await verifyDebtOwnership(id, userId);
    if (!debt) {
      return NextResponse.json(
        { error: 'Debt not found' },
        { status: 404 }
      );
    }

    await db.businessDebt.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Debt DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete debt' },
      { status: 500 }
    );
  }
}
