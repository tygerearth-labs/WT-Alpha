import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyJournalOwnership(id: string, userId: string) {
  const journal = await db.tradingJournal.findFirst({
    where: { id },
    include: {
      portfolio: { include: { business: { select: { userId: true } } } },
    },
  });
  return journal?.portfolio.business.userId === userId ? journal : null;
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

    const journal = await verifyJournalOwnership(id, userId);
    if (!journal) {
      return NextResponse.json(
        { error: 'Journal not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      type,
      entryPrice,
      exitPrice,
      quantity,
      pnl,
      pnlPercentage,
      riskReward,
      fees,
      notes,
      date,
      closedAt,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (type !== undefined) updateData.type = type;
    if (entryPrice !== undefined) updateData.entryPrice = parseFloat(entryPrice) || 0;
    if (exitPrice !== undefined) updateData.exitPrice = exitPrice ? parseFloat(exitPrice) : null;
    if (quantity !== undefined) updateData.quantity = parseFloat(quantity) || 0;
    if (pnl !== undefined) updateData.pnl = parseFloat(pnl) || 0;
    if (pnlPercentage !== undefined) updateData.pnlPercentage = parseFloat(pnlPercentage) || 0;
    if (riskReward !== undefined) updateData.riskReward = riskReward ? parseFloat(riskReward) : null;
    if (fees !== undefined) updateData.fees = parseFloat(fees) || 0;
    if (notes !== undefined) updateData.notes = notes;
    if (date !== undefined) updateData.date = date ? new Date(date) : new Date();
    if (closedAt !== undefined) updateData.closedAt = closedAt ? new Date(closedAt) : null;

    const updated = await db.tradingJournal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ journal: updated });
  } catch (error) {
    console.error('Journal PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update journal' },
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

    const journal = await verifyJournalOwnership(id, userId);
    if (!journal) {
      return NextResponse.json(
        { error: 'Journal not found' },
        { status: 404 }
      );
    }

    await db.tradingJournal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Journal DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete journal' },
      { status: 500 }
    );
  }
}
