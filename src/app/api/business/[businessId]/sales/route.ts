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

    if (isNaN(page) || page < 1 || isNaN(pageSize) || pageSize < 1) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const whereClause: Record<string, unknown> = { businessId };
    if (customerId) whereClause.customerId = customerId;
    if (paymentMethod) whereClause.paymentMethod = paymentMethod;

    const sales = await db.businessSale.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true },
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
    const { customerId, invoiceId, description, amount, date, paymentMethod, notes,
        downPayment, downPaymentPct, installmentTempo, installmentAmount, investorSharePct } = body;

    if (!description || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Description and amount are required' },
        { status: 400 }
      );
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
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

    // Verify invoice exists and belongs to this business if provided
    if (invoiceId) {
      const invoice = await db.businessInvoice.findFirst({
        where: { id: invoiceId, businessId },
      });
      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found for this business' },
          { status: 404 }
        );
      }
    }

    const numTempo = installmentTempo ? parseInt(String(installmentTempo)) : null;
    const numDP = downPayment ? parseFloat(String(downPayment)) : null;
    const numInstAmount = installmentAmount ? parseFloat(String(installmentAmount)) : null;

    const sale = await db.businessSale.create({
      data: {
        businessId,
        customerId,
        invoiceId,
        description,
        amount: numAmount,
        date: date ? new Date(date) : new Date(),
        paymentMethod,
        notes,
        downPayment: numDP,
        downPaymentPct: downPaymentPct ? parseFloat(String(downPaymentPct)) : null,
        installmentTempo: numTempo,
        installmentAmount: numInstAmount,
        investorSharePct: investorSharePct ? parseFloat(String(investorSharePct)) : null,
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    // Auto-create piutang debt for installment sales
    if (numTempo && numTempo > 0) {
      const remaining = numAmount - (numDP || 0);
      try {
        // Get customer name as counterpart
        let counterpart = description;
        if (customerId) {
          const cust = await db.businessCustomer.findUnique({ where: { id: customerId } });
          if (cust) counterpart = cust.name;
        }
        // Calculate next installment date (1 month from now)
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 1);

        await db.businessDebt.create({
          data: {
            businessId,
            type: 'piutang',
            counterpart,
            amount: remaining,
            remaining,
            description: `Cicilan: ${description}`,
            status: 'active',
            downPayment: numDP || 0,
            installmentAmount: numInstAmount || (numTempo > 0 ? remaining / numTempo : 0),
            installmentPeriod: numTempo,
            nextInstallmentDate: nextDate,
          },
        });
      } catch (piutangErr) {
        console.error('Auto-create piutang error:', piutangErr);
      }
    }

    // Create notification for new sale
    try {
      const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(numAmount);

      await db.notification.create({
        data: {
          userId,
          type: 'income',
          title: 'Penjualan Baru',
          message: `Penjualan ${formattedAmount} — ${description}`,
          amount: numAmount,
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
