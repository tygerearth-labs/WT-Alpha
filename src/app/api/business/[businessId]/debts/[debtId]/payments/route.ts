import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyDebtOwnership(
  debtId: string,
  businessId: string,
  userId: string
) {
  const debt = await db.businessDebt.findFirst({
    where: { id: debtId, businessId },
    include: { business: { select: { userId: true } } },
  });
  return debt?.business.userId === userId ? debt : null;
}

// GET — List all payments for a debt with computed totalPaid
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string; debtId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId, debtId } = await params;

    const debt = await verifyDebtOwnership(debtId, businessId, userId);
    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    const payments = await db.businessDebtPayment.findMany({
      where: { debtId, businessId },
      orderBy: { paymentDate: 'desc' },
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({ payments, totalPaid });
  } catch (error) {
    console.error('Debt payments GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST — Create a payment record and recalculate debt remaining
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; debtId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId, debtId } = await params;

    const debt = await verifyDebtOwnership(debtId, businessId, userId);
    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    if (debt.status === 'paid') {
      return NextResponse.json(
        { error: 'This debt is already fully paid' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { amount, paymentDate, paymentMethod, notes } = body;

    // Validate required fields
    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Amount is required' },
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

    // Validate payment method if provided
    if (
      paymentMethod !== undefined &&
      !['transfer', 'cash', 'qris'].includes(paymentMethod)
    ) {
      return NextResponse.json(
        { error: 'Payment method must be transfer, cash, or qris' },
        { status: 400 }
      );
    }

    // Create the payment record
    const payment = await db.businessDebtPayment.create({
      data: {
        debtId,
        businessId,
        amount: numAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: paymentMethod || null,
        notes: notes || null,
      },
    });

    // Recalculate totalPaid and remaining
    const allPayments = await db.businessDebtPayment.findMany({
      where: { debtId },
      select: { amount: true },
    });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, debt.amount - totalPaid);

    // Determine new status
    let newStatus: string;
    if (remaining <= 0) {
      newStatus = 'paid';
    } else if (remaining < debt.amount) {
      newStatus = 'partially_paid';
    } else {
      newStatus = debt.status;
    }

    // Auto-create BusinessCash entry for investor share when receiving cicilan
    if (debt.referenceId && debt.type === 'piutang') {
      try {
        const linkedSale = await db.businessSale.findUnique({
          where: { id: debt.referenceId },
          select: { investorSharePct: true, description: true },
        });
        if (linkedSale && linkedSale.investorSharePct && linkedSale.investorSharePct > 0) {
          const investorShare = numAmount * (linkedSale.investorSharePct / 100);
          if (investorShare > 0) {
            await db.businessCash.create({
              data: {
                businessId,
                type: 'investor',
                amount: investorShare,
                description: `Bagian investor (${linkedSale.investorSharePct}%) dari cicilan: ${linkedSale.description}`,
                category: 'investor_pendapatan',
                date: paymentDate ? new Date(paymentDate) : new Date(),
                referenceId: debt.referenceId,
                notes: `Investor share ${linkedSale.investorSharePct}% dari cicilan piutang`,
              },
            });
          }
        }
      } catch (investorCashErr) {
        console.error('Auto-create investor cash from cicilan error:', investorCashErr);
      }
    }

    // Update the debt record
    const updateData: Record<string, unknown> = {
      remaining,
      status: newStatus,
    };

    // Clear installment-related fields if fully paid
    if (newStatus === 'paid') {
      updateData.nextInstallmentDate = null;
    }

    await db.businessDebt.update({
      where: { id: debtId },
      data: updateData,
    });

    return NextResponse.json(
      {
        payment,
        remaining,
        totalPaid,
        status: newStatus,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Debt payment POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
