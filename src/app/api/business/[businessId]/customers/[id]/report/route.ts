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
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId, id } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Fetch business name
    const business = await db.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    });

    // Fetch customer
    const customer = await db.businessCustomer.findFirst({
      where: { id: id, businessId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Fetch all sales for this customer
    const sales = await db.businessSale.findMany({
      where: { id, businessId },
      orderBy: { date: 'desc' },
    });

    // Fetch all invoices for this customer
    const invoices = await db.businessInvoice.findMany({
      where: { id, businessId },
      orderBy: { date: 'desc' },
    });

    // Fetch piutang (receivables) matching this customer name
    const piutang = await db.businessDebt.findMany({
      where: {
        businessId,
        type: 'piutang',
        counterpart: customer.name,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch payment history for all piutang of this customer
    const piutangIds = piutang.map((p) => p.id);
    let payments: Array<{
      id: string;
      amount: number;
      paymentDate: Date;
      paymentMethod: string | null;
      notes: string | null;
      debtDescription: string | null;
    }> = [];

    if (piutangIds.length > 0) {
      const debtPayments = await db.businessDebtPayment.findMany({
        where: { debtId: { in: piutangIds }, businessId },
        orderBy: { paymentDate: 'desc' },
        include: {
          debt: {
            select: { description: true },
          },
        },
      });

      payments = debtPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        notes: p.notes,
        debtDescription: p.debt.description,
      }));
    }

    // Calculate sales summary
    const totalPurchases = sales.length;
    const totalAmount = sales.reduce((sum, s) => sum + s.amount, 0);
    const avgOrderValue = totalPurchases > 0 ? totalAmount / totalPurchases : 0;

    // Calculate piutang summary
    const activePiutang = piutang.filter(
      (p) => p.status === 'active' || p.status === 'partially_paid' || p.status === 'overdue'
    );
    const totalOutstanding = activePiutang.reduce((sum, p) => sum + p.remaining, 0);
    const paidPiutang = piutang.filter((p) => p.status === 'paid');
    const activeCount = activePiutang.length;
    const paidCount = paidPiutang.length;

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        createdAt: customer.createdAt.toISOString(),
      },
      business: {
        name: business?.name || 'Unknown Business',
      },
      sales: sales.map((s) => ({
        id: s.id,
        description: s.description,
        amount: s.amount,
        date: s.date.toISOString(),
        paymentMethod: s.paymentMethod,
        status: 'completed',
      })),
      salesSummary: {
        totalPurchases,
        totalAmount,
        avgOrderValue,
      },
      piutang: piutang.map((p) => ({
        id: p.id,
        description: p.description,
        amount: p.amount,
        remaining: p.remaining,
        status: p.status,
        dueDate: p.dueDate?.toISOString() || null,
        nextInstallmentDate: p.nextInstallmentDate?.toISOString() || null,
      })),
      piutangSummary: {
        totalOutstanding,
        activeCount,
        paidCount,
      },
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate instanceof Date ? p.paymentDate.toISOString() : new Date(p.paymentDate).toISOString(),
        paymentMethod: p.paymentMethod,
        debtDescription: p.debtDescription,
      })),
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date.toISOString(),
        dueDate: inv.dueDate?.toISOString() || null,
        total: inv.total,
        paidAmount: inv.paidAmount,
        status: inv.status,
      })),
    });
  } catch (error) {
    console.error('Customer report GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer report' },
      { status: 500 }
    );
  }
}
