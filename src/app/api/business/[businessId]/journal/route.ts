import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyPortfolioOwnership(portfolioId: string, userId: string) {
  const portfolio = await db.investmentPortfolio.findFirst({
    where: { id: portfolioId },
    include: { business: { select: { userId: true } } },
  });
  return portfolio?.business.userId === userId ? portfolio : null;
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

    // Verify business belongs to user
    const business = await db.business.findFirst({
      where: { id: businessId, userId },
    });
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const portfolioId = searchParams.get('portfolioId');
    const type = searchParams.get('type');

    // If portfolioId is provided, verify ownership and filter
    if (portfolioId) {
      const portfolio = await verifyPortfolioOwnership(portfolioId, userId);
      if (!portfolio) {
        return NextResponse.json(
          { error: 'Portfolio not found' },
          { status: 404 }
        );
      }
    }

    const whereClause: Record<string, unknown> = {};
    if (portfolioId) whereClause.portfolioId = portfolioId;
    if (type) whereClause.type = type;

    // If no portfolioId, get all journals for portfolios belonging to this business
    if (!portfolioId) {
      const portfolioIds = await db.investmentPortfolio.findMany({
        where: { businessId },
        select: { id: true },
      });
      whereClause.portfolioId = { in: portfolioIds.map((p) => p.id) };
    }

    const journals = await db.tradingJournal.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ journals });
  } catch (error) {
    console.error('Journal GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journals' },
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

    // Verify business belongs to user
    const business = await db.business.findFirst({
      where: { id: businessId, userId },
    });
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      portfolioId,
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

    if (!portfolioId || !type || !entryPrice || !quantity) {
      return NextResponse.json(
        { error: 'portfolioId, type, entryPrice, and quantity are required' },
        { status: 400 }
      );
    }

    // Verify portfolio belongs to this business
    const portfolio = await db.investmentPortfolio.findFirst({
      where: { id: portfolioId, businessId },
    });
    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found for this business' },
        { status: 404 }
      );
    }

    if (!['buy', 'sell'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be buy or sell' },
        { status: 400 }
      );
    }

    const journal = await db.tradingJournal.create({
      data: {
        portfolioId,
        type,
        entryPrice: parseFloat(entryPrice) || 0,
        exitPrice: exitPrice ? parseFloat(exitPrice) : null,
        quantity: parseFloat(quantity) || 0,
        pnl: pnl !== undefined ? parseFloat(pnl) : 0,
        pnlPercentage: pnlPercentage !== undefined ? parseFloat(pnlPercentage) : 0,
        riskReward: riskReward ? parseFloat(riskReward) : null,
        fees: fees !== undefined ? parseFloat(fees) : 0,
        notes,
        date: date ? new Date(date) : new Date(),
        closedAt: closedAt ? new Date(closedAt) : null,
      },
    });

    // Create notification if journal is a closed trade with PnL
    if ((type === 'sell' || closedAt) && pnl !== undefined) {
      try {
        const isProfit = parseFloat(pnl) > 0;
        const formattedPnl = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(Math.abs(parseFloat(pnl)));

        await db.notification.create({
          data: {
            userId,
            type: 'trade',
            title: isProfit ? 'Trade Profit! 📈' : 'Trade Loss 📉',
            message: `${portfolio.symbol} - ${isProfit ? 'Profit' : 'Loss'} ${formattedPnl} (${pnlPercentage}%).`,
            amount: parseFloat(pnl) || 0,
            actionUrl: '/dashboard',
          },
        });
      } catch (notifError) {
        console.error('Trading journal notification error:', notifError);
      }
    }

    return NextResponse.json({ journal }, { status: 201 });
  } catch (error) {
    console.error('Journal POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create journal' },
      { status: 500 }
    );
  }
}
