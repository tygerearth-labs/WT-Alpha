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
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100);

    const whereClause: Record<string, unknown> = { businessId };
    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      whereClause.date = dateFilter;
    }

    const cashEntries = await db.businessCash.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      cashEntries,
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
    const { type, amount, description, category, date, referenceId, notes } = body;

    if (!type || !amount || !description) {
      return NextResponse.json(
        { error: 'Type, amount, and description are required' },
        { status: 400 }
      );
    }

    if (!['kas_besar', 'kas_kecil', 'kas_keluar'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be kas_besar, kas_kecil, or kas_keluar' },
        { status: 400 }
      );
    }

    const cashEntry = await db.businessCash.create({
      data: {
        businessId,
        type,
        amount: parseFloat(amount) || 0,
        description,
        category,
        date: date ? new Date(date) : new Date(),
        referenceId,
        notes,
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
