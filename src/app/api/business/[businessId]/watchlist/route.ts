import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

// ── Types ────────────────────────────────────────────────────────────────────

interface WatchlistCreateBody {
  symbol: string;
  type: string;
  name?: string;
  targetBuy?: number;
  targetSell?: number;
  alertOnSignal?: boolean;
}

// ── Helper: fetch batch prices via internal batch endpoint ───────────────────

async function fetchBatchPrices(businessId: string, items: Array<{ symbol: string; type: string }>) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/business/${businessId}/market-data/batch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: items }),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.prices || []) as Array<{
      symbol: string;
      type: string;
      price: number;
      change24h: number;
    }>;
  } catch {
    return [];
  }
}

// ── GET: List watchlist items with live prices ───────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { businessId } = await params;

    const items = await db.watchlistItem.findMany({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (items.length === 0) {
      return NextResponse.json({ watchlist: [] });
    }

    // Fetch live prices via batch endpoint
    const prices = await fetchBatchPrices(
      businessId,
      items.map((i) => ({ symbol: i.symbol, type: i.type })),
    );
    const priceMap = new Map(prices.map((p) => [`${p.type}:${p.symbol.toUpperCase()}`, p]));

    const enriched = items.map((item) => {
      const live = priceMap.get(`${item.type}:${item.symbol.toUpperCase()}`);
      return {
        ...item,
        price: live?.price ?? 0,
        change24h: live?.change24h ?? 0,
      };
    });

    return NextResponse.json({ watchlist: enriched });
  } catch (error) {
    console.error('Watchlist GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 },
    );
  }
}

// ── POST: Add asset to watchlist ─────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { businessId } = await params;
    const body: WatchlistCreateBody = await request.json();

    if (!body.symbol || !body.type) {
      return NextResponse.json(
        { error: 'symbol and type are required' },
        { status: 400 },
      );
    }

    const allowedTypes = ['crypto', 'saham', 'forex', 'komoditas', 'indeks'];
    if (!allowedTypes.includes(body.type)) {
      return NextResponse.json(
        { error: 'type must be one of: crypto, saham, forex, komoditas, indeks' },
        { status: 400 },
      );
    }

    // Upsert: if it already exists, just reactivate it
    const item = await db.watchlistItem.upsert({
      where: {
        businessId_type_symbol: {
          businessId,
          symbol: body.symbol.toUpperCase(),
          type: body.type,
        },
      },
      update: {
        name: body.name ?? undefined,
        targetBuy: body.targetBuy ?? undefined,
        targetSell: body.targetSell ?? undefined,
        alertOnSignal: body.alertOnSignal ?? true,
        isActive: true,
      },
      create: {
        businessId,
        symbol: body.symbol.toUpperCase(),
        type: body.type,
        name: body.name ?? null,
        targetBuy: body.targetBuy ?? null,
        targetSell: body.targetSell ?? null,
        alertOnSignal: body.alertOnSignal ?? true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Watchlist POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add to watchlist' },
      { status: 500 },
    );
  }
}

// ── DELETE: Remove from watchlist ────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { businessId } = await params;
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type');

    if (!symbol || !type) {
      return NextResponse.json(
        { error: 'symbol and type query params are required' },
        { status: 400 },
      );
    }

    await db.watchlistItem.deleteMany({
      where: { businessId, symbol: symbol.toUpperCase(), type },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Watchlist DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from watchlist' },
      { status: 500 },
    );
  }
}
