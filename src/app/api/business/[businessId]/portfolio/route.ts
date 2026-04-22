import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyBusinessOwnership(businessId: string, userId: string) {
  const business = await db.business.findFirst({
    where: { id: businessId, userId },
  });
  return !!business;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const whereClause: Record<string, unknown> = { businessId };
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;

    const portfolios = await db.investmentPortfolio.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { journals: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Return raw portfolio data — frontend handles enrichment with live prices
    return NextResponse.json({ portfolios });
  } catch (error) {
    console.error('Portfolio GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolios' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
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

    if (!type || !symbol || !entryPrice || !quantity) {
      return NextResponse.json(
        { error: 'Type, symbol, entryPrice, and quantity are required' },
        { status: 400 }
      );
    }

    if (!['saham', 'crypto', 'forex', 'komoditas', 'indeks'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be saham, crypto, forex, komoditas, or indeks' },
        { status: 400 }
      );
    }

    const portfolio = await db.investmentPortfolio.create({
      data: {
        businessId,
        type,
        symbol,
        name,
        entryPrice: parseFloat(entryPrice) || 0,
        currentPrice: parseFloat(currentPrice) || 0,
        quantity: parseFloat(quantity) || 0,
        targetPrice: targetPrice ? parseFloat(targetPrice) : null,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        status: status || 'open',
        notes,
      },
    });

    // Auto-create a TradingJournal entry for the initial buy
    await db.tradingJournal.create({
      data: {
        portfolioId: portfolio.id,
        type: 'buy',
        entryPrice: portfolio.entryPrice,
        quantity: portfolio.quantity,
        pnl: 0,
        pnlPercentage: 0,
        notes: `Initial buy: ${portfolio.quantity} ${portfolio.symbol} @ ${portfolio.entryPrice}`,
      },
    });

    return NextResponse.json({ portfolio }, { status: 201 });
  } catch (error) {
    console.error('Portfolio POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create portfolio' },
      { status: 500 }
    );
  }
}
