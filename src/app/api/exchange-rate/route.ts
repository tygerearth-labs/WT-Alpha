import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/exchange-rate?from=USD&to=IDR
export async function GET(request: NextRequest) {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Record<string, unknown> = {};
    if (from) where.fromCurrency = from;
    if (to) where.toCurrency = to;

    const rates = await db.exchangeRate.findMany({
      where,
      orderBy: { date: 'desc' },
      take: from && to ? 1 : 50,
    });

    return NextResponse.json({ rates });
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 500 });
  }
}

// POST /api/exchange-rate — Create or update rate
export async function POST(request: NextRequest) {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;

  try {
    const body = await request.json();
    const { fromCurrency, toCurrency, rate, source } = body;

    if (!fromCurrency || !toCurrency || !rate) {
      return NextResponse.json({ error: 'fromCurrency, toCurrency, and rate are required' }, { status: 400 });
    }

    const exchangeRate = await db.exchangeRate.create({
      data: {
        fromCurrency,
        toCurrency,
        rate: parseFloat(rate),
        source: source || 'manual',
        date: new Date(),
      },
    });

    return NextResponse.json({ exchangeRate }, { status: 201 });
  } catch (error) {
    console.error('Exchange rate create error:', error);
    return NextResponse.json({ error: 'Failed to create exchange rate' }, { status: 500 });
  }
}
