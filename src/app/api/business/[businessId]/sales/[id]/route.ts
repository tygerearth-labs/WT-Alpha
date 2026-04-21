import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifySaleOwnership(id: string, userId: string) {
  const sale = await db.businessSale.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  });
  return sale?.business.userId === userId ? sale : null;
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

    const sale = await verifySaleOwnership(id, userId);
    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { customerId, invoiceId, description, amount, date, paymentMethod, notes } = body;

    const updateData: Record<string, unknown> = {};
    if (customerId !== undefined) updateData.customerId = customerId;
    if (invoiceId !== undefined) updateData.invoiceId = invoiceId;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = parseFloat(amount) || 0;
    if (date !== undefined) updateData.date = date ? new Date(date) : new Date();
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await db.businessSale.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ sale: updated });
  } catch (error) {
    console.error('Sale PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update sale' },
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

    const sale = await verifySaleOwnership(id, userId);
    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    await db.businessSale.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sale DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete sale' },
      { status: 500 }
    );
  }
}
