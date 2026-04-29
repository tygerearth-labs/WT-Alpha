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
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100);

    const whereClause: Record<string, unknown> = { businessId };
    if (status) whereClause.status = status;

    const invoices = await db.businessInvoice.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      invoices,
      pagination: { page, pageSize, hasMore: invoices.length === pageSize },
    });
  } catch (error) {
    console.error('Invoices GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
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
      customerId,
      invoiceNumber,
      date,
      dueDate,
      items,
      subtotal,
      tax,
      discount,
      total,
      status,
      notes,
    } = body;

    if (!invoiceNumber || !items || total === undefined) {
      return NextResponse.json(
        { error: 'invoiceNumber, items, and total are required' },
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

    const invoice = await db.businessInvoice.create({
      data: {
        businessId,
        customerId,
        invoiceNumber,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        items: typeof items === 'string' ? items : JSON.stringify(items),
        subtotal: parseFloat(subtotal) || 0,
        tax: parseFloat(tax) || 0,
        discount: parseFloat(discount) || 0,
        total: parseFloat(total) || 0,
        status: status || 'pending',
        notes,
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    // Create notification for invoice creation
    try {
      const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(total);

      await db.notification.create({
        data: {
          userId,
          type: 'invoice',
          title: 'Invoice Baru',
          message: `Invoice ${invoiceNumber} sebesar ${formattedAmount} telah dibuat.`,
          amount: parseFloat(total) || 0,
          actionUrl: 'biz-invoice',
        },
      });
    } catch (notifError) {
      console.error('Invoice notification error:', notifError);
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('Invoices POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
