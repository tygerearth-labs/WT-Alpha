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
    const customerId = searchParams.get('customerId');
    const paymentMethod = searchParams.get('paymentMethod');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100);

    const whereClause: Record<string, unknown> = { businessId };
    if (customerId) whereClause.customerId = customerId;
    if (paymentMethod) whereClause.paymentMethod = paymentMethod;

    const sales = await db.businessSale.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true },
        },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      sales,
      pagination: { page, pageSize, hasMore: sales.length === pageSize },
    });
  } catch (error) {
    console.error('Sales GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
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
    const { customerId, invoiceId, description, amount, date, paymentMethod, notes } = body;

    if (!description || !amount) {
      return NextResponse.json(
        { error: 'Description and amount are required' },
        { status: 400 }
      );
    }

    // Verify customer belongs to this business if provided
    if (customerId) {
      const customer = await db.businessCustomer.findFirst({
        where: { id: customerId, businessId },
      });
      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found for this business' },
          { status: 404 }
        );
      }
    }

    const sale = await db.businessSale.create({
      data: {
        businessId,
        customerId,
        invoiceId,
        description,
        amount: parseFloat(amount) || 0,
        date: date ? new Date(date) : new Date(),
        paymentMethod,
        notes,
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    // Create notification for new sale
    try {
      const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(parseFloat(amount) || 0);

      await db.notification.create({
        data: {
          userId,
          type: 'income',
          title: 'Penjualan Baru',
          message: `Penjualan ${formattedAmount} — ${description}`,
          amount: parseFloat(amount) || 0,
          actionUrl: '/dashboard',
        },
      });
    } catch (notifError) {
      console.error('Sale notification error:', notifError);
    }

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    console.error('Sales POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    );
  }
}
