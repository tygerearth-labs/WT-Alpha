import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyPortfolioOwnership(id: string, userId: string) {
  const portfolio = await db.investmentPortfolio.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  });
  return portfolio?.business.userId === userId ? portfolio : null;
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

    const portfolio = await verifyPortfolioOwnership(id, userId);
    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      type,
      symbol,
      name,
      entryPrice,
      currentPrice,
      quantity,
      targetPrice,
      stopLoss,
      status,
      notes,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (type !== undefined) updateData.type = type;
    if (symbol !== undefined) updateData.symbol = symbol;
    if (name !== undefined) updateData.name = name;
    if (entryPrice !== undefined) updateData.entryPrice = parseFloat(entryPrice) || 0;
    if (currentPrice !== undefined) updateData.currentPrice = parseFloat(currentPrice) || 0;
    if (quantity !== undefined) updateData.quantity = parseFloat(quantity) || 0;
    if (targetPrice !== undefined) updateData.targetPrice = targetPrice ? parseFloat(targetPrice) : null;
    if (stopLoss !== undefined) updateData.stopLoss = stopLoss ? parseFloat(stopLoss) : null;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await db.investmentPortfolio.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ portfolio: updated });
  } catch (error) {
    console.error('Portfolio PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
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

    const portfolio = await verifyPortfolioOwnership(id, userId);
    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    await db.investmentPortfolio.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Portfolio DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete portfolio' },
      { status: 500 }
    );
  }
}
