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
    const source = searchParams.get('source');
    const category = searchParams.get('category');
    const period = searchParams.get('period'); // "day" | "week" | "month" | "year"
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const summaryOnly = searchParams.get('summary') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100);

    if (isNaN(page) || page < 1 || isNaN(pageSize) || pageSize < 1) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const whereClause: Record<string, unknown> = { businessId };
    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    // Period-based date filtering (takes precedence over startDate/endDate)
    if (period) {
      const now = new Date();
      let from: Date;
      let to: Date;
      switch (period) {
        case 'day': {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          from = start;
          to = new Date(start.getTime() + 86400000 - 1);
          break;
        }
        case 'week': {
          const day = now.getDay() || 7;
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
          to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - day));
          to.setHours(23, 59, 59, 999);
          break;
        }
        case 'month': {
          from = new Date(now.getFullYear(), now.getMonth(), 1);
          to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        }
        case 'year': {
          from = new Date(now.getFullYear(), 0, 1);
          to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;
        }
        default:
          break;
      }
      if (from && to) {
        whereClause.date = { gte: from, lte: to };
      }
    } else if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      whereClause.date = dateFilter;
    }
    if (source) whereClause.source = source;

    // If summary=true, return allocation breakdown instead of paginated entries
    if (summaryOnly) {
      const allCashEntries = await db.businessCash.findMany({
        where: { businessId },
        select: {
          type: true,
          amount: true,
          source: true,
        },
      });

      const kasBesarTotal = allCashEntries
        .filter((c) => c.type === 'kas_besar')
        .reduce((sum, c) => sum + c.amount, 0);
      const kasKecilTotal = allCashEntries
        .filter((c) => c.type === 'kas_kecil')
        .reduce((sum, c) => sum + c.amount, 0);
      const investorTotal = allCashEntries
        .filter((c) => c.type === 'investor')
        .reduce((sum, c) => sum + c.amount, 0);

      // Expenses by source: kas_keluar entries with source field
      const expenseFromKasBesar = allCashEntries
        .filter((c) => c.type === 'kas_keluar' && c.source === 'kas_besar')
        .reduce((sum, c) => sum + c.amount, 0);
      const expenseFromKasKecil = allCashEntries
        .filter((c) => c.type === 'kas_keluar' && c.source === 'kas_kecil')
        .reduce((sum, c) => sum + c.amount, 0);
      const expenseFromInvestor = allCashEntries
        .filter((c) => c.type === 'kas_keluar' && c.source === 'investor')
        .reduce((sum, c) => sum + c.amount, 0);
      const totalExpenses = allCashEntries
        .filter((c) => c.type === 'kas_keluar')
        .reduce((sum, c) => sum + c.amount, 0);

      const kasBesarSaldo = kasBesarTotal - expenseFromKasBesar;
      const kasKecilSaldo = kasKecilTotal - expenseFromKasKecil;
      const investorSaldo = investorTotal - expenseFromInvestor;
      const netCash = kasBesarSaldo + kasKecilSaldo + investorSaldo - (totalExpenses - expenseFromKasBesar - expenseFromKasKecil - expenseFromInvestor);

      return NextResponse.json({
        kasBesarTotal,
        kasKecilTotal,
        investorTotal,
        expenseFromKasBesar,
        expenseFromKasKecil,
        expenseFromInvestor,
        kasBesarSaldo,
        kasKecilSaldo,
        netCash,
        allocationBreakdown: [
          { source: 'kas_besar', total: kasBesarTotal, expenses: expenseFromKasBesar, saldo: kasBesarSaldo },
          { source: 'kas_kecil', total: kasKecilTotal, expenses: expenseFromKasKecil, saldo: kasKecilSaldo },
          { source: 'investor', total: investorTotal, expenses: expenseFromInvestor, saldo: investorSaldo },
        ],
      });
    }

    const [cashEntries, totalResult] = await Promise.all([
      db.businessCash.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.businessCash.aggregate({
        _sum: { amount: true },
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      cashEntries,
      total: totalResult._sum.amount || 0,
      pagination: { page, pageSize, hasMore: cashEntries.length === pageSize },
    });
  } catch (error) {
    console.error('Cash GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash entries' },
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
    const { type, amount, description, category, date, referenceId, notes, source, investorId } = body;

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (!type || amount === undefined || amount === null || !description) {
      return NextResponse.json(
        { error: 'Type, amount, and description are required' },
        { status: 400 }
      );
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (!['kas_besar', 'kas_kecil', 'kas_keluar', 'investor'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be kas_besar, kas_kecil, kas_keluar, or investor' },
        { status: 400 }
      );
    }

    const cashEntry = await db.businessCash.create({
      data: {
        businessId,
        type,
        amount: numAmount,
        description,
        category,
        date: date ? new Date(date) : new Date(),
        referenceId,
        notes,
        source: source || null,
        investorId: investorId || null,
      },
    });

    return NextResponse.json({ cashEntry }, { status: 201 });
  } catch (error) {
    console.error('Cash POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create cash entry' },
      { status: 500 }
    );
  }
}
