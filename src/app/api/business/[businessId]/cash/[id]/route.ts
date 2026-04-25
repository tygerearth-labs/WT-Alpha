import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyCashOwnership(id: string, userId: string) {
  const cash = await db.businessCash.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  });
  return cash?.business.userId === userId ? cash : null;
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

    const cash = await verifyCashOwnership(id, userId);
    if (!cash) {
      return NextResponse.json(
        { error: 'Cash entry not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { type, amount, description, category, date, referenceId, notes, source, investorId } = body;

    const updateData: Record<string, unknown> = {};
    if (type !== undefined) updateData.type = type;
    if (amount !== undefined) updateData.amount = parseFloat(amount) || 0;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = date ? new Date(date) : new Date();
    if (referenceId !== undefined) updateData.referenceId = referenceId;
    if (notes !== undefined) updateData.notes = notes;
    if (source !== undefined) updateData.source = source || null;
    if (investorId !== undefined) updateData.investorId = investorId || null;

    const updated = await db.businessCash.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ cashEntry: updated });
  } catch (error) {
    console.error('Cash PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update cash entry' },
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

    const cash = await verifyCashOwnership(id, userId);
    if (!cash) {
      return NextResponse.json(
        { error: 'Cash entry not found' },
        { status: 404 }
      );
    }

    await db.businessCash.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cash DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete cash entry' },
      { status: 500 }
    );
  }
}
